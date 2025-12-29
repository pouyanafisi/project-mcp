#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
	ListResourcesRequestSchema,
	ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFile, readdir, stat, writeFile, mkdir } from 'fs/promises';
import { join, extname, dirname, basename } from 'path';
import Fuse from 'fuse.js';
import matter from 'gray-matter';
import { lookup } from 'mime-types';

// Source directories
const PROJECT_ROOT = process.cwd();
const DOCS_DIR = process.env.DOCS_DIR || join(PROJECT_ROOT, 'docs');
const PROJECT_DIR = join(PROJECT_ROOT, '.project');
const TODOS_DIR = join(PROJECT_DIR, 'todos');

/**
 * Intent to source mapping.
 * Maps user intent to which directories should be searched.
 * @type {Record<string, string[]>}
 */
const INTENT_SOURCES = {
	project: ['project', 'root', 'docs'], // .project/, root files, docs/
	docs: ['docs'], // Only docs/
	plan: ['project'], // Only .project/
	todos: ['project'],
	roadmap: ['project'],
	status: ['project'],
	operational: ['project'],
};

/**
 * Project MCP Server
 * Provides intent-based search across project documentation sources.
 *
 * @class ProjectMCPServer
 */
class ProjectMCPServer {
	constructor() {
		this.server = new Server(
			{
				name: 'project-mcp',
				version: '1.0.0',
			},
			{
				capabilities: {
					tools: {},
					resources: {},
				},
			}
		);

		this.setupHandlers();
		this.allFilesCache = null;
		this.allFilesIndex = null;
	}

	setupHandlers() {
		this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
			tools: [
				{
					name: 'search_project',
					description:
						'Search across all project sources: .project/ (operational truth), root-level files, and docs/ (reference truth). Use this when the user says "project", "the project", or asks about project status, plans, todos, or roadmap. Maps natural language to appropriate sources automatically.',
					inputSchema: {
						type: 'object',
						properties: {
							query: {
								type: 'string',
								description:
									'Search query. Can be a single word, multiple words, or a phrase. The search is semantic and will find relevant content even with partial matches.',
							},
							intent: {
								type: 'string',
								description:
									'Optional: Intent type to map to sources. Options: "project" (searches .project/, root, docs), "docs" (only docs/), "plan/todos/roadmap/status/operational" (only .project/). If not specified, automatically detects from query.',
								enum: ['project', 'docs', 'plan', 'todos', 'roadmap', 'status', 'operational', ''],
							},
							maxResults: {
								type: 'number',
								description: 'Maximum number of results to return. Default is 10, maximum is 50.',
								default: 10,
								minimum: 1,
								maximum: 50,
							},
						},
						required: ['query'],
					},
				},
				{
					name: 'search_docs',
					description:
						'Search only the docs/ directory for reference documentation. Use this when the user specifically asks for "docs" or "documentation". Returns relevant documentation chunks with file paths and content snippets.',
					inputSchema: {
						type: 'object',
						properties: {
							query: {
								type: 'string',
								description:
									'Search query. Can be a single word, multiple words, or a phrase. The search is semantic and will find relevant content even with partial matches.',
							},
							category: {
								type: 'string',
								description:
									'Optional: Filter by documentation category. Options: product, architecture, operations, api, guides, reference, or leave empty for all.',
								enum: ['product', 'architecture', 'operations', 'api', 'guides', 'reference', ''],
							},
							maxResults: {
								type: 'number',
								description: 'Maximum number of results to return. Default is 10, maximum is 50.',
								default: 10,
								minimum: 1,
								maximum: 50,
							},
						},
						required: ['query'],
					},
				},
				{
					name: 'get_doc',
					description:
						'Get the full content of a specific file. Supports files from .project/, root-level, or docs/. Use the path as returned from search results.',
					inputSchema: {
						type: 'object',
						properties: {
							path: {
								type: 'string',
								description:
									'Path to the file. Can be relative to project root (e.g., ".project/index.md", "README.md", "docs/architecture/ARCHITECTURE_SPEC.md").',
							},
						},
						required: ['path'],
					},
				},
				{
					name: 'list_docs',
					description:
						'List all available documentation files organized by category. Use this to discover what documentation is available or to get an overview of the documentation structure.',
					inputSchema: {
						type: 'object',
						properties: {
							category: {
								type: 'string',
								description:
									'Optional: Filter by category. Options: product, architecture, operations, api, guides, reference, or leave empty for all.',
								enum: ['product', 'architecture', 'operations', 'api', 'guides', 'reference', ''],
							},
						},
					},
				},
				{
					name: 'get_doc_structure',
					description:
						'Get the complete documentation directory structure with file paths and descriptions. Useful for understanding the organization of documentation.',
					inputSchema: {
						type: 'object',
						properties: {},
					},
				},
				{
					name: 'manage_project_file',
					description:
						'Smart tool that automatically determines which project file to create or update based on context. Use this when making changes to the project - it will check project state and determine if index.md, ROADMAP.md, TODO.md, STATUS.md, or DECISIONS.md should be created/updated. This is the primary tool for managing project documentation during development.',
					inputSchema: {
						type: 'object',
						properties: {
							action: {
								type: 'string',
								description:
									'The action being performed: "planning" (creates/updates ROADMAP), "task" (creates/updates TODO), "status_change" (creates/updates STATUS), "decision" (creates/updates DECISIONS), "contract" (creates/updates index), "auto" (automatically determines based on content).',
								enum: ['planning', 'task', 'status_change', 'decision', 'contract', 'auto'],
							},
							content: {
								type: 'string',
								description:
									'The content to add or update. For "auto" mode, describe what you\'re doing and the tool will determine the appropriate file.',
							},
							fileType: {
								type: 'string',
								description:
									'Optional: Force a specific file type. If not provided and action is "auto", the tool will determine automatically.',
								enum: ['roadmap', 'todo', 'status', 'index', 'decisions', ''],
							},
						},
						required: ['action', 'content'],
					},
				},
				{
					name: 'create_or_update_roadmap',
					description:
						'Creates or updates the ROADMAP.md file in .project/ directory. Use this when planning future work, milestones, or phases. If the file exists, intelligently merges new content with existing roadmap.',
					inputSchema: {
						type: 'object',
						properties: {
							content: {
								type: 'string',
								description:
									'The roadmap content to add. Can be a new section, milestone, or phase. The tool will merge with existing content if the file exists.',
							},
							section: {
								type: 'string',
								description:
									'Optional: The section to add to (e.g., "Q1 2025", "Phase 1", "Future Considerations"). If not provided, will append to appropriate section or create new.',
							},
							replace: {
								type: 'boolean',
								description:
									'If true, replaces the entire file. If false (default), merges with existing content.',
								default: false,
							},
						},
						required: ['content'],
					},
				},
				{
					name: 'create_or_update_todo',
					description:
						'Creates or updates the TODO.md file in .project/ directory. Use this when adding tasks, marking items complete, or updating task status. Intelligently organizes tasks into sections (In Progress, Next Up, Blocked, Completed).',
					inputSchema: {
						type: 'object',
						properties: {
							content: {
								type: 'string',
								description:
									'The task or todo item to add. Can be a single task or multiple tasks. Use markdown checkbox format: "- [ ] Task description".',
							},
							section: {
								type: 'string',
								description:
									'Optional: The section to add to: "in_progress", "next_up", "blocked", "completed". If not provided, defaults to "next_up".',
								enum: ['in_progress', 'next_up', 'blocked', 'completed', ''],
							},
							markComplete: {
								type: 'string',
								description:
									'Optional: Task description to mark as complete. Will move from current section to "Completed" section.',
							},
							replace: {
								type: 'boolean',
								description:
									'If true, replaces the entire file. If false (default), merges with existing content.',
								default: false,
							},
						},
						required: ['content'],
					},
				},
				{
					name: 'create_or_update_status',
					description:
						'Creates or updates the STATUS.md file in .project/ directory. Use this when updating project health, recent changes, metrics, or current phase. Automatically updates the "Last Updated" timestamp.',
					inputSchema: {
						type: 'object',
						properties: {
							content: {
								type: 'string',
								description:
									'The status update content. Can include current phase, health status, recent changes, metrics, risks, or next milestone.',
							},
							updateType: {
								type: 'string',
								description:
									'Optional: Type of update: "phase", "health", "changes", "metrics", "risks", "milestone", "general". Helps organize the update appropriately.',
								enum: ['phase', 'health', 'changes', 'metrics', 'risks', 'milestone', 'general', ''],
							},
							replace: {
								type: 'boolean',
								description:
									'If true, replaces the entire file. If false (default), merges with existing content.',
								default: false,
							},
						},
						required: ['content'],
					},
				},
				{
					name: 'create_or_update_index',
					description:
						'Creates or updates the index.md file in .project/ directory. This is the contract file that defines how agents should interpret sources. Use this when setting up project structure or updating source mappings.',
					inputSchema: {
						type: 'object',
						properties: {
							content: {
								type: 'string',
								description:
									'The contract content to add. Should define source mappings and how agents should interpret different queries.',
							},
							replace: {
								type: 'boolean',
								description:
									'If true, replaces the entire file. If false (default), merges with existing content.',
								default: false,
							},
						},
						required: ['content'],
					},
				},
				{
					name: 'create_or_update_decisions',
					description:
						'Creates or updates the DECISIONS.md file in .project/ directory. Use this when documenting architecture decisions, trade-offs, or rationale. Helps maintain a decision log for the project.',
					inputSchema: {
						type: 'object',
						properties: {
							content: {
								type: 'string',
								description:
									'The decision content to add. Should include the decision, context, trade-offs, and rationale.',
							},
							decisionTitle: {
								type: 'string',
								description:
									'Optional: Title for the decision entry. If not provided, will extract from content or use a timestamp.',
							},
							replace: {
								type: 'boolean',
								description:
									'If true, replaces the entire file. If false (default), merges with existing content.',
								default: false,
							},
						},
						required: ['content'],
					},
				},
				{
					name: 'create_task',
					description:
						'Creates a new task with YAML frontmatter metadata. Uses Jira-like IDs (e.g., AUTH-001, API-042) for stable references. Supports dependencies, priorities, estimates, due dates, and tags. Agents can determine execution order by checking dependencies and priorities.',
					inputSchema: {
						type: 'object',
						properties: {
							title: {
								type: 'string',
								description:
									'The title of the task (e.g., "Implement OAuth authentication", "Fix login bug").',
							},
							project: {
								type: 'string',
								description:
									'Project/Epic identifier used in the task ID (e.g., "AUTH", "API", "FRONTEND"). Will be uppercased. The task ID will be {PROJECT}-{NNN}.',
							},
							description: {
								type: 'string',
								description:
									'Detailed description of the task. Can include markdown formatting.',
							},
							owner: {
								type: 'string',
								description:
									'Who is responsible for this task (e.g., "cursor", "john-doe", "backend-team").',
							},
							priority: {
								type: 'string',
								description:
									'Priority level: "P0" (critical/blocker), "P1" (high), "P2" (medium/default), "P3" (low).',
								enum: ['P0', 'P1', 'P2', 'P3'],
								default: 'P2',
							},
							status: {
								type: 'string',
								description:
									'Current status: "todo" (not started), "in_progress" (being worked on), "blocked" (waiting on something), "review" (needs review), "done" (completed).',
								enum: ['todo', 'in_progress', 'blocked', 'review', 'done'],
								default: 'todo',
							},
							depends_on: {
								type: 'array',
								items: { type: 'string' },
								description:
									'Array of task IDs this task depends on (e.g., ["AUTH-001", "AUTH-002"]). Task cannot start until dependencies are done.',
							},
							blocked_by: {
								type: 'array',
								items: { type: 'string' },
								description:
									'Array of task IDs or external blockers (e.g., ["AUTH-003", "waiting-on-api-key"]). Different from depends_on - these are blockers that prevent progress.',
							},
							estimate: {
								type: 'string',
								description:
									'Time estimate (e.g., "2h", "1d", "3d", "1w"). Use h=hours, d=days, w=weeks.',
							},
							due: {
								type: 'string',
								description:
									'Due date in YYYY-MM-DD format (e.g., "2025-01-15").',
							},
							tags: {
								type: 'array',
								items: { type: 'string' },
								description:
									'Array of tags for categorization (e.g., ["security", "urgent", "tech-debt", "feature"]).',
							},
							subtasks: {
								type: 'array',
								items: { type: 'string' },
								description:
									'Array of subtask descriptions. Will be rendered as a checklist in the task.',
							},
						},
						required: ['title', 'project'],
					},
				},
				{
					name: 'update_task',
					description:
						'Updates an existing task by ID. Can update any field including status, priority, owner, dependencies, etc. Use this to transition tasks through workflow states.',
					inputSchema: {
						type: 'object',
						properties: {
							id: {
								type: 'string',
								description:
									'The task ID to update (e.g., "AUTH-001").',
							},
							title: {
								type: 'string',
								description: 'New title for the task.',
							},
							description: {
								type: 'string',
								description: 'New description. Use "append:TEXT" to append to existing description.',
							},
							owner: {
								type: 'string',
								description: 'New owner for the task.',
							},
							priority: {
								type: 'string',
								description: 'New priority level.',
								enum: ['P0', 'P1', 'P2', 'P3'],
							},
							status: {
								type: 'string',
								description: 'New status. Transitioning to "done" will set completed date.',
								enum: ['todo', 'in_progress', 'blocked', 'review', 'done'],
							},
							depends_on: {
								type: 'array',
								items: { type: 'string' },
								description: 'New dependency list. Use "add:ID" or "remove:ID" to modify existing.',
							},
							blocked_by: {
								type: 'array',
								items: { type: 'string' },
								description: 'New blocked_by list.',
							},
							estimate: {
								type: 'string',
								description: 'New time estimate.',
							},
							due: {
								type: 'string',
								description: 'New due date (YYYY-MM-DD).',
							},
							tags: {
								type: 'array',
								items: { type: 'string' },
								description: 'New tags list. Use "add:TAG" or "remove:TAG" to modify existing.',
							},
							add_subtask: {
								type: 'string',
								description: 'Add a new subtask to the task.',
							},
							complete_subtask: {
								type: 'string',
								description: 'Mark a subtask as complete (partial match on subtask text).',
							},
						},
						required: ['id'],
					},
				},
				{
					name: 'get_next_task',
					description:
						'Returns the next task(s) that should be worked on. Considers: dependencies (only returns tasks whose dependencies are done), priority (P0 first), status (excludes done/blocked), and optionally filters by owner or project. This is the key tool for agentic execution - call this to know what to do next.',
					inputSchema: {
						type: 'object',
						properties: {
							owner: {
								type: 'string',
								description: 'Filter by owner. Only return tasks assigned to this owner.',
							},
							project: {
								type: 'string',
								description: 'Filter by project. Only return tasks from this project.',
							},
							include_blocked: {
								type: 'boolean',
								description: 'Include blocked tasks in results. Default: false.',
								default: false,
							},
							limit: {
								type: 'number',
								description: 'Maximum number of tasks to return. Default: 5.',
								default: 5,
							},
						},
					},
				},
				{
					name: 'list_tasks',
					description:
						'Lists all tasks with optional filtering. Returns a summary view of tasks organized by status and priority.',
					inputSchema: {
						type: 'object',
						properties: {
							project: {
								type: 'string',
								description: 'Filter by project.',
							},
							owner: {
								type: 'string',
								description: 'Filter by owner.',
							},
							status: {
								type: 'string',
								description: 'Filter by status.',
								enum: ['todo', 'in_progress', 'blocked', 'review', 'done', ''],
							},
							priority: {
								type: 'string',
								description: 'Filter by priority.',
								enum: ['P0', 'P1', 'P2', 'P3', ''],
							},
							tag: {
								type: 'string',
								description: 'Filter by tag.',
							},
						},
					},
				},
				{
					name: 'sync_todo_index',
					description:
						'Syncs the parent TODO.md file with all tasks. Generates a dashboard view with tasks organized by status, priority counts, dependency graph, and execution order. This provides a bird\'s eye view of all work.',
					inputSchema: {
						type: 'object',
						properties: {
							format: {
								type: 'string',
								description: 'Output format: "dashboard" (default, visual overview), "table" (compact table), "kanban" (by status columns).',
								enum: ['dashboard', 'table', 'kanban'],
								default: 'dashboard',
							},
						},
					},
				},
				{
					name: 'lint_project_docs',
					description:
						'Validates project documentation against standards. Checks for required files, valid frontmatter, broken dependencies, missing fields, and formatting issues. Can auto-fix common problems. Run this before commits to ensure documentation quality.',
					inputSchema: {
						type: 'object',
						properties: {
							fix: {
								type: 'boolean',
								description: 'If true, automatically fix issues that can be auto-corrected (missing timestamps, formatting, etc.). Default: false (report only).',
								default: false,
							},
							strict: {
								type: 'boolean',
								description: 'If true, enforce stricter rules (all tasks must have estimates, due dates, descriptions). Default: false.',
								default: false,
							},
							scope: {
								type: 'string',
								description: 'What to lint: "all" (everything), "tasks" (only task files), "docs" (only documentation files). Default: "all".',
								enum: ['all', 'tasks', 'docs'],
								default: 'all',
							},
						},
					},
				},
				{
					name: 'init_project',
					description:
						'Initializes the .project/ directory with all standard files following strict templates. Creates index.md (contract), TODO.md (dashboard), ROADMAP.md, STATUS.md, DECISIONS.md, and todos/ directory. Use this to bootstrap a new project with proper structure.',
					inputSchema: {
						type: 'object',
						properties: {
							project_name: {
								type: 'string',
								description: 'Name of the project. Used in headers and metadata.',
							},
							project_description: {
								type: 'string',
								description: 'Brief description of the project.',
							},
							overwrite: {
								type: 'boolean',
								description: 'If true, overwrites existing files. Default: false (skip existing).',
								default: false,
							},
						},
						required: ['project_name'],
					},
				},
				{
					name: 'import_tasks',
					description:
						'Parses a plan document (ROADMAP.md, requirements doc, or structured text) and generates YAML task files. Extracts tasks from markdown lists, phases, or sections and creates properly formatted task files with dependencies inferred from structure.',
					inputSchema: {
						type: 'object',
						properties: {
							source: {
								type: 'string',
								description: 'Path to the source file to parse (e.g., "ROADMAP.md", ".project/ROADMAP.md"). Can also be raw markdown content if source_type is "content".',
							},
							source_type: {
								type: 'string',
								description: 'Type of source: "file" (path to file) or "content" (raw markdown). Default: "file".',
								enum: ['file', 'content'],
								default: 'file',
							},
							project: {
								type: 'string',
								description: 'Project prefix for task IDs (e.g., "AUTH", "API"). Required.',
							},
							default_owner: {
								type: 'string',
								description: 'Default owner for created tasks. Default: "unassigned".',
								default: 'unassigned',
							},
							default_priority: {
								type: 'string',
								description: 'Default priority for tasks. Default: "P2".',
								enum: ['P0', 'P1', 'P2', 'P3'],
								default: 'P2',
							},
							dry_run: {
								type: 'boolean',
								description: 'If true, shows what would be created without actually creating files. Default: false.',
								default: false,
							},
						},
						required: ['source', 'project'],
					},
				},
				{
					name: 'check_project_state',
					description:
						'Checks the current state of project management files. Returns which files exist (.project/index.md, ROADMAP.md, TODO.md, STATUS.md, DECISIONS.md) and provides a summary of project state. Use this before making changes to understand what exists.',
					inputSchema: {
						type: 'object',
						properties: {},
					},
				},
			],
		}));

		this.server.setRequestHandler(CallToolRequestSchema, async request => {
			const { name, arguments: args } = request.params;

			try {
				switch (name) {
					case 'search_project':
						return await this.searchProject(args);
					case 'search_docs':
						return await this.searchDocs(args);
					case 'get_doc':
						return await this.getDoc(args);
					case 'list_docs':
						return await this.listDocs(args);
					case 'get_doc_structure':
						return await this.getDocStructure();
					case 'manage_project_file':
						return await this.manageProjectFile(args);
					case 'create_or_update_roadmap':
						return await this.createOrUpdateRoadmap(args);
					case 'create_or_update_todo':
						return await this.createOrUpdateTodo(args);
					case 'create_or_update_status':
						return await this.createOrUpdateStatus(args);
					case 'create_or_update_index':
						return await this.createOrUpdateIndex(args);
					case 'create_or_update_decisions':
						return await this.createOrUpdateDecisions(args);
					case 'create_task':
						return await this.createTask(args);
					case 'update_task':
						return await this.updateTask(args);
					case 'get_next_task':
						return await this.getNextTask(args);
					case 'list_tasks':
						return await this.listTasks(args);
					case 'sync_todo_index':
						return await this.syncTodoIndex(args);
					case 'lint_project_docs':
						return await this.lintProjectDocs(args);
					case 'init_project':
						return await this.initProject(args);
					case 'import_tasks':
						return await this.importTasks(args);
					case 'check_project_state':
						return await this.checkProjectState(args);
					default:
						throw new Error(`Unknown tool: ${name}`);
				}
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error: ${error.message}`,
						},
					],
					isError: true,
				};
			}
		});

		this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
			resources: await this.listResources(),
		}));

		this.server.setRequestHandler(ReadResourceRequestSchema, async request => {
			const { uri } = request.params;
			const filePath = uri.replace('project://', '');
			const fullPath = join(PROJECT_ROOT, filePath);

			try {
				const content = await readFile(fullPath, 'utf-8');
				const mimeType = lookup(fullPath) || 'text/plain';

				return {
					contents: [
						{
							uri,
							mimeType,
							text: content,
						},
					],
				};
			} catch (error) {
				throw new Error(`Failed to read resource: ${error.message}`);
			}
		});
	}

	/**
	 * Detect intent from query string or use explicit intent.
	 *
	 * @param {string} query - The search query
	 * @param {string} [explicitIntent] - Explicitly provided intent
	 * @returns {string} The detected intent ('project', 'docs', 'plan', etc.)
	 */
	detectIntent(query, explicitIntent) {
		if (explicitIntent) {
			return explicitIntent;
		}

		const queryLower = query.toLowerCase();

		// Check for operational keywords
		if (/\b(plan|plans|todo|todos|roadmap|status|operational|current state|decisions)\b/.test(queryLower)) {
			return 'plan';
		}

		// Check for docs-specific keywords
		if (/\b(docs|documentation|reference|guide|guides|api docs)\b/.test(queryLower)) {
			return 'docs';
		}

		// Default to project (searches all sources)
		return 'project';
	}

	/**
	 * Get source directories for a given intent.
	 *
	 * @param {string} intent - The intent type
	 * @returns {string[]} Array of source names to search
	 */
	getSourcesForIntent(intent) {
		return INTENT_SOURCES[intent] || INTENT_SOURCES.project;
	}

	/**
	 * Load and index all files from all sources (.project/, root, docs/).
	 * Results are cached for performance.
	 *
	 * @returns {Promise<Array>} Array of indexed file objects
	 */
	async loadAllFiles() {
		if (this.allFilesCache) {
			return this.allFilesCache;
		}

		const allFiles = [];

		// Load .project/ directory
		try {
			await this.scanDirectory(PROJECT_DIR, '.project', allFiles, 'project');
		} catch (error) {
			// .project/ might not exist, that's okay
		}

		// Load root-level markdown files
		try {
			const rootFiles = await readdir(PROJECT_ROOT);
			for (const file of rootFiles) {
				if (extname(file) === '.md' && !file.startsWith('.')) {
					const fullPath = join(PROJECT_ROOT, file);
					try {
						const stats = await stat(fullPath);
						if (stats.isFile()) {
							const content = await readFile(fullPath, 'utf-8');
							const parsed = matter(content);
							allFiles.push({
								path: file,
								fullPath,
								source: 'root',
								title: parsed.data.title || this.extractTitle(content) || file,
								description: parsed.data.description || this.extractDescription(content),
								content: parsed.content,
								frontmatter: parsed.data,
								category: 'root',
							});
						}
					} catch (error) {
						console.error(`Error reading ${fullPath}:`, error.message);
					}
				}
			}
		} catch (error) {
			console.error('Error reading root files:', error.message);
		}

		// Load docs/ directory
		try {
			await this.scanDirectory(DOCS_DIR, 'docs', allFiles, 'docs');
		} catch (error) {
			// docs/ might not exist, that's okay
		}

		this.allFilesCache = allFiles;

		// Build search index
		this.allFilesIndex = new Fuse(allFiles, {
			keys: ['title', 'content', 'path', 'category', 'source'],
			threshold: 0.4,
			includeScore: true,
			includeMatches: true,
		});

		return allFiles;
	}

	async scanDirectory(dir, relativePath, files, source) {
		try {
			const entries = await readdir(dir, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = join(dir, entry.name);
				const relPath = relativePath ? join(relativePath, entry.name) : entry.name;

				if (entry.isDirectory()) {
					await this.scanDirectory(fullPath, relPath, files, source);
				} else if (entry.isFile() && extname(entry.name) === '.md') {
					try {
						const content = await readFile(fullPath, 'utf-8');
						const parsed = matter(content);
						const category = this.getCategory(relPath, source);

						files.push({
							path: relPath,
							fullPath,
							source,
							title: parsed.data.title || this.extractTitle(content) || entry.name,
							description: parsed.data.description || this.extractDescription(content),
							content: parsed.content,
							frontmatter: parsed.data,
							category,
						});
					} catch (error) {
						console.error(`Error reading ${fullPath}:`, error.message);
					}
				}
			}
		} catch (error) {
			// Directory might not exist, that's okay
		}
	}

	getCategory(path, source) {
		if (source === 'root') {
			return 'root';
		}
		if (source === 'project') {
			return 'project';
		}
		const parts = path.split('/');
		if (parts.length > 1 && parts[0] !== 'docs') {
			return parts[0];
		}
		if (parts.length > 2) {
			return parts[1];
		}
		return source;
	}

	extractTitle(content) {
		const match = content.match(/^#\s+(.+)$/m);
		return match ? match[1].trim() : null;
	}

	extractDescription(content) {
		const lines = content.split('\n').filter(line => line.trim());
		for (let i = 1; i < Math.min(5, lines.length); i++) {
			const line = lines[i].trim();
			if (line && !line.startsWith('#') && line.length > 20) {
				return line.substring(0, 200);
			}
		}
		return null;
	}

	async searchProject(args) {
		const { query, intent: explicitIntent, maxResults = 10 } = args;

		await this.loadAllFiles();

		// Detect intent from query
		const intent = this.detectIntent(query, explicitIntent);
		const sources = this.getSourcesForIntent(intent);

		// Filter files by source
		let filesToSearch = this.allFilesCache.filter(file => sources.includes(file.source));

		// Rebuild index with filtered files
		const index = new Fuse(filesToSearch, {
			keys: ['title', 'content', 'path', 'category', 'source'],
			threshold: 0.4,
			includeScore: true,
			includeMatches: true,
		});

		const results = index.search(query).slice(0, maxResults);

		const formattedResults = results.map(result => {
			const doc = result.item;
			const score = result.score || 0;
			const matches = result.matches || [];

			const snippet = this.extractSnippet(doc.content, query, matches);

			return {
				path: doc.path,
				title: doc.title,
				description: doc.description,
				source: doc.source,
				category: doc.category,
				relevanceScore: (1 - score).toFixed(3),
				snippet,
				matchedFields: matches.map(m => m.key).filter((v, i, a) => a.indexOf(v) === i),
			};
		});

		const resultText = formattedResults
			.map(result => {
				return `## ${result.title}
**Path:** \`${result.path}\`
**Source:** ${result.source} ${result.source === 'project' ? '(operational)' : result.source === 'docs' ? '(reference)' : '(root)'}
**Category:** ${result.category}
**Relevance:** ${result.relevanceScore}
${result.description ? `**Description:** ${result.description}\n` : ''}
**Snippet:**
\`\`\`
${result.snippet}
\`\`\`
`;
			})
			.join('\n---\n\n');

		const intentInfo =
			intent !== 'project' ? `\n*Intent detected: "${intent}" - searched ${sources.join(', ')} sources*\n` : '';

		return {
			content: [
				{
					type: 'text',
					text: intentInfo + (resultText || `No results found for query: "${query}"`),
				},
			],
		};
	}

	async searchDocs(args) {
		const { query, category, maxResults = 10 } = args;

		await this.loadAllFiles();

		let docsToSearch = this.allFilesCache.filter(file => file.source === 'docs');
		if (category) {
			docsToSearch = docsToSearch.filter(doc => doc.category === category);
		}

		const index = new Fuse(docsToSearch, {
			keys: ['title', 'content', 'path', 'category'],
			threshold: 0.4,
			includeScore: true,
			includeMatches: true,
		});

		const results = index.search(query).slice(0, maxResults);

		const formattedResults = results.map(result => {
			const doc = result.item;
			const score = result.score || 0;
			const matches = result.matches || [];

			const snippet = this.extractSnippet(doc.content, query, matches);

			return {
				path: doc.path,
				title: doc.title,
				description: doc.description,
				category: doc.category,
				relevanceScore: (1 - score).toFixed(3),
				snippet,
				matchedFields: matches.map(m => m.key).filter((v, i, a) => a.indexOf(v) === i),
			};
		});

		const resultText = formattedResults
			.map(result => {
				return `## ${result.title}
**Path:** \`${result.path}\`
**Category:** ${result.category}
**Relevance:** ${result.relevanceScore}
${result.description ? `**Description:** ${result.description}\n` : ''}
**Snippet:**
\`\`\`
${result.snippet}
\`\`\`
`;
			})
			.join('\n---\n\n');

		return {
			content: [
				{
					type: 'text',
					text: resultText || `No results found for query: "${query}"`,
				},
			],
		};
	}

	extractSnippet(content, query, matches) {
		const queryLower = query.toLowerCase();
		const contentLower = content.toLowerCase();

		const index = contentLower.indexOf(queryLower);
		if (index !== -1) {
			const start = Math.max(0, index - 150);
			const end = Math.min(content.length, index + query.length + 150);
			let snippet = content.substring(start, end);

			const sentenceStart = snippet.lastIndexOf('\n\n', 100);
			if (sentenceStart > 0) {
				snippet = snippet.substring(sentenceStart).trim();
			}

			const sentenceEnd = snippet.indexOf('\n\n', snippet.length - 100);
			if (sentenceEnd > 0) {
				snippet = snippet.substring(0, sentenceEnd).trim();
			}

			return snippet || content.substring(0, 300);
		}

		return content.substring(0, 300);
	}

	async getDoc(args) {
		const { path } = args;

		// Try different path resolutions
		const possiblePaths = [
			join(PROJECT_ROOT, path), // Absolute from project root
			path.startsWith('.project/') ? join(PROJECT_ROOT, path) : null,
			path.startsWith('docs/') ? join(PROJECT_ROOT, path) : null,
			join(DOCS_DIR, path), // Relative to docs
			join(PROJECT_DIR, path), // Relative to .project
		].filter(Boolean);

		for (const fullPath of possiblePaths) {
			try {
				const content = await readFile(fullPath, 'utf-8');
				const parsed = matter(content);

				return {
					content: [
						{
							type: 'text',
							text: `# ${parsed.data.title || basename(path)}\n\n${parsed.content}`,
						},
					],
				};
			} catch (error) {
				// Try next path
				continue;
			}
		}

		return {
			content: [
				{
					type: 'text',
					text: `Error reading file "${path}": File not found in any expected location.`,
				},
			],
			isError: true,
		};
	}

	async listDocs(args) {
		const { category } = args || {};
		await this.loadAllFiles();

		let docs = this.allFilesCache.filter(file => file.source === 'docs');
		if (category) {
			docs = docs.filter(doc => doc.category === category);
		}

		const grouped = docs.reduce((acc, doc) => {
			if (!acc[doc.category]) {
				acc[doc.category] = [];
			}
			acc[doc.category].push({
				path: doc.path,
				title: doc.title,
				description: doc.description,
			});
			return acc;
		}, {});

		const resultText = Object.entries(grouped)
			.map(([cat, files]) => {
				const fileList = files
					.map(
						file =>
							`  - **${file.title}** (\`${file.path}\`)${file.description ? `\n    ${file.description}` : ''}`
					)
					.join('\n');
				return `### ${cat}\n${fileList}`;
			})
			.join('\n\n');

		return {
			content: [
				{
					type: 'text',
					text: resultText || 'No documentation files found.',
				},
			],
		};
	}

	async getDocStructure() {
		await this.loadAllFiles();

		const structure = {};
		this.allFilesCache.forEach(doc => {
			const parts = doc.path.split('/');
			let current = structure;

			for (let i = 0; i < parts.length - 1; i++) {
				const part = parts[i];
				if (!current[part]) {
					current[part] = { _files: [] };
				}
				current = current[part];
			}

			const fileName = parts[parts.length - 1];
			current._files.push({
				name: fileName,
				path: doc.path,
				title: doc.title,
				description: doc.description,
				source: doc.source,
			});
		});

		const formatStructure = (obj, indent = 0) => {
			let result = '';
			const prefix = '  '.repeat(indent);

			for (const [key, value] of Object.entries(obj)) {
				if (key === '_files') {
					value.forEach(file => {
						result += `${prefix}- **${file.title}** (\`${file.path}\`) [${file.source}]${file.description ? `\n${prefix}  ${file.description}` : ''}\n`;
					});
				} else {
					result += `${prefix}📁 ${key}/\n`;
					result += formatStructure(value, indent + 1);
				}
			}

			return result;
		};

		return {
			content: [
				{
					type: 'text',
					text: formatStructure(structure) || 'No documentation structure found.',
				},
			],
		};
	}

	async listResources() {
		await this.loadAllFiles();

		return this.allFilesCache.map(doc => ({
			uri: `project://${doc.path}`,
			name: doc.title,
			description: doc.description || `File: ${doc.path} [${doc.source}]`,
			mimeType: 'text/markdown',
		}));
	}

	/**
	 * Ensure .project directory exists
	 */
	async ensureProjectDir() {
		try {
			await mkdir(PROJECT_DIR, { recursive: true });
		} catch (error) {
			// Directory might already exist, that's okay
		}
	}

	/**
	 * Ensure .project/todos directory exists
	 */
	async ensureTodosDir() {
		try {
			await mkdir(TODOS_DIR, { recursive: true });
		} catch (error) {
			// Directory might already exist, that's okay
		}
	}

	/**
	 * Check if a file exists
	 */
	async fileExists(filePath) {
		try {
			await stat(filePath);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get current date in readable format
	 */
	getCurrentDate() {
		return new Date().toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	}

	/**
	 * Check project state - which files exist
	 */
	async checkProjectState() {
		await this.ensureProjectDir();

		const indexPath = join(PROJECT_DIR, 'index.md');
		const roadmapPath = join(PROJECT_DIR, 'ROADMAP.md');
		const todoPath = join(PROJECT_DIR, 'TODO.md');
		const statusPath = join(PROJECT_DIR, 'STATUS.md');
		const decisionsPath = join(PROJECT_DIR, 'DECISIONS.md');

		const state = {
			index: await this.fileExists(indexPath),
			roadmap: await this.fileExists(roadmapPath),
			todo: await this.fileExists(todoPath),
			status: await this.fileExists(statusPath),
			decisions: await this.fileExists(decisionsPath),
		};

		let summary = '## Project State\n\n';
		summary += `**index.md:** ${state.index ? '✅ Exists' : '❌ Missing'} (Contract file - defines source mappings)\n`;
		summary += `**ROADMAP.md:** ${state.roadmap ? '✅ Exists' : '❌ Missing'} (Future plans, milestones)\n`;
		summary += `**TODO.md:** ${state.todo ? '✅ Exists' : '❌ Missing'} (Current todos, in-progress work)\n`;
		summary += `**STATUS.md:** ${state.status ? '✅ Exists' : '❌ Missing'} (Current project status, health)\n`;
		summary += `**DECISIONS.md:** ${state.decisions ? '✅ Exists' : '❌ Missing'} (Architecture decisions, trade-offs)\n\n`;

		const missingCount = Object.values(state).filter(v => !v).length;
		if (missingCount > 0) {
			summary += `⚠️ **${missingCount} project management file(s) missing.** Consider creating them:\n`;
			if (!state.index) {
				summary += '- Use `create_or_update_index` to set up the contract file\n';
			}
			if (!state.roadmap) {
				summary += '- Use `create_or_update_roadmap` when planning future work\n';
			}
			if (!state.todo) {
				summary += '- Use `create_or_update_todo` when adding tasks\n';
			}
			if (!state.status) {
				summary += '- Use `create_or_update_status` when updating project health\n';
			}
			if (!state.decisions) {
				summary += '- Use `create_or_update_decisions` when documenting architecture decisions\n';
			}
		} else {
			summary += '✅ **All project management files exist.**\n';
		}

		return {
			content: [
				{
					type: 'text',
					text: summary,
				},
			],
		};
	}

	/**
	 * Smart tool that determines which file to create/update
	 */
	async manageProjectFile(args) {
		const { action, content, fileType } = args;

		await this.ensureProjectDir();

		// If fileType is explicitly provided, use it
		if (fileType) {
			switch (fileType) {
				case 'roadmap':
					return await this.createOrUpdateRoadmap({ content });
				case 'todo':
					return await this.createOrUpdateTodo({ content });
				case 'status':
					return await this.createOrUpdateStatus({ content });
				case 'index':
					return await this.createOrUpdateIndex({ content });
				case 'decisions':
					return await this.createOrUpdateDecisions({ content });
			}
		}

		// Determine based on action
		if (action === 'auto') {
			// Analyze content to determine file type
			const contentLower = content.toLowerCase();
			if (
				/\b(contract|source mapping|intent|agent|interpret|canonical)\b/.test(
					contentLower
				)
			) {
				return await this.createOrUpdateIndex({ content });
			} else if (
				/\b(roadmap|milestone|phase|quarter|q[1-4]|future|plan|planning)\b/.test(
					contentLower
				)
			) {
				return await this.createOrUpdateRoadmap({ content });
			} else if (
				/\b(task|todo|todo|in progress|blocked|complete|done|finish)\b/.test(
					contentLower
				)
			) {
				return await this.createOrUpdateTodo({ content });
			} else if (
				/\b(status|health|phase|metric|risk|blocker|milestone|update)\b/.test(
					contentLower
				)
			) {
				return await this.createOrUpdateStatus({ content });
			} else if (
				/\b(decision|architecture|trade.?off|rationale|adr|choice|selected)\b/.test(
					contentLower
				)
			) {
				return await this.createOrUpdateDecisions({ content });
			} else {
				// Default to TODO for general changes
				return await this.createOrUpdateTodo({ content });
			}
		}

		// Map action to file type
		switch (action) {
			case 'planning':
				return await this.createOrUpdateRoadmap({ content });
			case 'task':
				return await this.createOrUpdateTodo({ content });
			case 'status_change':
				return await this.createOrUpdateStatus({ content });
			case 'decision':
				return await this.createOrUpdateDecisions({ content });
			case 'contract':
				return await this.createOrUpdateIndex({ content });
			default:
				return await this.createOrUpdateTodo({ content });
		}
	}

	/**
	 * Create or update ROADMAP.md
	 */
	async createOrUpdateRoadmap(args) {
		const { content, section, replace = false } = args;
		await this.ensureProjectDir();

		const roadmapPath = join(PROJECT_DIR, 'ROADMAP.md');
		const exists = await this.fileExists(roadmapPath);

		if (!exists || replace) {
			// Create new file
			const roadmapContent = `# Project Roadmap

${content}

---
*Last Updated: ${this.getCurrentDate()}*
`;
			await writeFile(roadmapPath, roadmapContent, 'utf-8');
			return {
				content: [
					{
						type: 'text',
						text: `✅ ${exists ? 'Updated' : 'Created'} ROADMAP.md\n\n${roadmapContent}`,
					},
				],
			};
		}

		// Merge with existing content
		const existingContent = await readFile(roadmapPath, 'utf-8');
		let updatedContent = existingContent;

		if (section) {
			// Try to find and update specific section
			const sectionRegex = new RegExp(
				`(##+\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^#]*)`,
				'i'
			);
			if (sectionRegex.test(existingContent)) {
				// Append to existing section
				updatedContent = existingContent.replace(
					sectionRegex,
					`$1\n\n${content}\n`
				);
			} else {
				// Add new section
				updatedContent = `${existingContent}\n\n## ${section}\n\n${content}\n`;
			}
		} else {
			// Append to end
			updatedContent = `${existingContent}\n\n${content}\n`;
		}

		// Update timestamp
		updatedContent = updatedContent.replace(
			/\*Last Updated: .*\*/,
			`*Last Updated: ${this.getCurrentDate()}*`
		);
		if (!updatedContent.includes('*Last Updated:')) {
			updatedContent += `\n\n---\n*Last Updated: ${this.getCurrentDate()}*\n`;
		}

		await writeFile(roadmapPath, updatedContent, 'utf-8');
		return {
			content: [
				{
					type: 'text',
					text: `✅ Updated ROADMAP.md\n\nAdded content to ${section || 'the roadmap'}`,
				},
			],
		};
	}

	/**
	 * Create or update TODO.md
	 */
	async createOrUpdateTodo(args) {
		const { content, section = 'next_up', markComplete, replace = false } = args;
		await this.ensureProjectDir();

		const todoPath = join(PROJECT_DIR, 'TODO.md');
		const exists = await this.fileExists(todoPath);

		if (!exists || replace) {
			// Create new file with standard structure
			const sectionMap = {
				in_progress: 'In Progress',
				next_up: 'Next Up',
				blocked: 'Blocked',
				completed: 'Completed',
			};
			const sectionTitle = sectionMap[section] || 'Next Up';

			const todoContent = `# TODO

## ${sectionTitle}

${content}

## In Progress

## Next Up

## Blocked

## Completed

---
*Last Updated: ${this.getCurrentDate()}*
`;
			await writeFile(todoPath, todoContent, 'utf-8');
			return {
				content: [
					{
						type: 'text',
						text: `✅ ${exists ? 'Updated' : 'Created'} TODO.md\n\nAdded to ${sectionTitle} section`,
					},
				],
			};
		}

		// Merge with existing content
		let existingContent = await readFile(todoPath, 'utf-8');

		// Handle marking tasks as complete
		if (markComplete) {
			// Find and mark task as complete
			const taskRegex = new RegExp(
				`(-\\s*\\[\\s*\\]\\s*${markComplete.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
				'gi'
			);
			if (taskRegex.test(existingContent)) {
				existingContent = existingContent.replace(
					taskRegex,
					'- [x] ' + markComplete
				);
				// Move to completed section if not already there
				if (!existingContent.includes(`## Completed`)) {
					existingContent += `\n\n## Completed\n\n`;
				}
				if (!existingContent.includes(`- [x] ${markComplete}`)) {
					existingContent = existingContent.replace(
						/(## Completed\n)/,
						`$1- [x] ${markComplete}\n`
					);
				}
			}
		}

		// Add new content to appropriate section
		const sectionMap = {
			in_progress: 'In Progress',
			next_up: 'Next Up',
			blocked: 'Blocked',
			completed: 'Completed',
		};
		const sectionTitle = sectionMap[section] || 'Next Up';

		// Ensure section exists
		if (!existingContent.includes(`## ${sectionTitle}`)) {
			existingContent += `\n\n## ${sectionTitle}\n\n`;
		}

		// Add content to section
		const sectionRegex = new RegExp(
			`(## ${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n)`,
			'i'
		);
		if (sectionRegex.test(existingContent)) {
			existingContent = existingContent.replace(
				sectionRegex,
				`$1${content}\n\n`
			);
		} else {
			existingContent += `\n\n## ${sectionTitle}\n\n${content}\n`;
		}

		// Update timestamp
		existingContent = existingContent.replace(
			/\*Last Updated: .*\*/,
			`*Last Updated: ${this.getCurrentDate()}*`
		);
		if (!existingContent.includes('*Last Updated:')) {
			existingContent += `\n\n---\n*Last Updated: ${this.getCurrentDate()}*\n`;
		}

		await writeFile(todoPath, existingContent, 'utf-8');
		return {
			content: [
				{
					type: 'text',
					text: `✅ Updated TODO.md\n\n${markComplete ? `Marked "${markComplete}" as complete. ` : ''}Added content to ${sectionTitle} section`,
				},
			],
		};
	}

	/**
	 * Create or update STATUS.md
	 */
	async createOrUpdateStatus(args) {
		const { content, updateType = 'general', replace = false } = args;
		await this.ensureProjectDir();

		const statusPath = join(PROJECT_DIR, 'STATUS.md');
		const exists = await this.fileExists(statusPath);

		if (!exists || replace) {
			// Create new file with standard structure
			const statusContent = `# Project Status

**Last Updated:** ${this.getCurrentDate()}

## Current Phase

${updateType === 'phase' ? content : 'To be determined'}

## Health

${updateType === 'health' ? content : '🟡 **Yellow** - Status unknown'}

## Recent Changes

${updateType === 'changes' ? content : 'No recent changes recorded'}

## Metrics

${updateType === 'metrics' ? content : 'No metrics available'}

## Risks & Blockers

${updateType === 'risks' ? content : 'None currently'}

## Next Milestone

${updateType === 'milestone' ? content : 'No milestone set'}

---
*Last Updated: ${this.getCurrentDate()}*
`;
			await writeFile(statusPath, statusContent, 'utf-8');
			return {
				content: [
					{
						type: 'text',
						text: `✅ ${exists ? 'Updated' : 'Created'} STATUS.md\n\n${statusContent}`,
					},
				],
			};
		}

		// Merge with existing content
		let existingContent = await readFile(statusPath, 'utf-8');

		// Map updateType to section
		const sectionMap = {
			phase: 'Current Phase',
			health: 'Health',
			changes: 'Recent Changes',
			metrics: 'Metrics',
			risks: 'Risks & Blockers',
			milestone: 'Next Milestone',
			general: 'Recent Changes',
		};
		const sectionTitle = sectionMap[updateType] || 'Recent Changes';

		// Ensure section exists
		if (!existingContent.includes(`## ${sectionTitle}`)) {
			existingContent += `\n\n## ${sectionTitle}\n\n`;
		}

		// Update or append to section
		const sectionRegex = new RegExp(
			`(## ${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n)([^#]*)`,
			'i'
		);
		if (sectionRegex.test(existingContent)) {
			if (updateType === 'changes' || updateType === 'general') {
				// Append to changes section
				existingContent = existingContent.replace(
					sectionRegex,
					`$1$2\n${content}\n`
				);
			} else {
				// Replace section content
				existingContent = existingContent.replace(
					sectionRegex,
					`$1${content}\n\n`
				);
			}
		} else {
			existingContent += `\n\n## ${sectionTitle}\n\n${content}\n`;
		}

		// Update timestamp
		existingContent = existingContent.replace(
			/\*\*Last Updated:\*\* .*/,
			`**Last Updated:** ${this.getCurrentDate()}`
		);
		existingContent = existingContent.replace(
			/\*Last Updated: .*\*/,
			`*Last Updated: ${this.getCurrentDate()}*`
		);
		if (!existingContent.includes('Last Updated')) {
			existingContent = existingContent.replace(
				/(# Project Status\n)/,
				`$1\n**Last Updated:** ${this.getCurrentDate()}\n`
			);
		}

		await writeFile(statusPath, existingContent, 'utf-8');
		return {
			content: [
				{
					type: 'text',
					text: `✅ Updated STATUS.md\n\nUpdated ${sectionTitle} section`,
				},
			],
		};
	}

	/**
	 * Create or update index.md (Contract file)
	 */
	async createOrUpdateIndex(args) {
		const { content, replace = false } = args;
		await this.ensureProjectDir();

		const indexPath = join(PROJECT_DIR, 'index.md');
		const exists = await this.fileExists(indexPath);

		if (!exists || replace) {
			// Create new file with standard contract structure
			const indexContent = `# Project Knowledge Index

## Contract for AI Agents

When a user says **"project"**, **"the project"**, or **"my project"**, the canonical sources of truth are, in order:

1. **\`.project/\`** — Current state, plans, todos, decisions, operational truth
2. **Root markdown files** — README.md, DEVELOPMENT.md, ARCHITECTURE.md, etc.
3. **\`docs/\`** — Long-form reference documentation

${content}

## Source Mappings

### "project" / "the project" / "my project"

Searches (in order):

- \`.project/\` directory
- Root-level markdown files (README.md, DEVELOPMENT.md, ARCHITECTURE.md, etc.)
- \`docs/\` directory

### "docs" / "documentation" / "reference"

Searches only:

- \`docs/\` directory

### "plan" / "todos" / "roadmap" / "status" / "operational" / "decisions"

Searches only:

- \`.project/\` directory

## Principles

- **Natural language stays natural** - Users say "project" not ".project/"
- **Repo stays conventional** - Standard directory names
- **Agents don't guess** - Explicit mappings defined here
- **Intent over structure** - Language maps to intent, not directory names

---
*Last Updated: ${this.getCurrentDate()}*
`;
			await writeFile(indexPath, indexContent, 'utf-8');
			return {
				content: [
					{
						type: 'text',
						text: `✅ ${exists ? 'Updated' : 'Created'} index.md (Contract file)\n\n${exists ? 'Updated' : 'Created'} the contract file that defines how agents should interpret sources.`,
					},
				],
			};
		}

		// Merge with existing content
		const existingContent = await readFile(indexPath, 'utf-8');
		let updatedContent = existingContent;

		// Append new content before the "---" separator if it exists
		if (updatedContent.includes('---')) {
			updatedContent = updatedContent.replace(
				/\n---\n/,
				`\n\n${content}\n\n---\n`
			);
		} else {
			updatedContent = `${updatedContent}\n\n${content}\n`;
		}

		// Update timestamp
		updatedContent = updatedContent.replace(
			/\*Last Updated: .*\*/,
			`*Last Updated: ${this.getCurrentDate()}*`
		);
		if (!updatedContent.includes('*Last Updated:')) {
			updatedContent += `\n\n---\n*Last Updated: ${this.getCurrentDate()}*\n`;
		}

		await writeFile(indexPath, updatedContent, 'utf-8');
		return {
			content: [
				{
					type: 'text',
					text: `✅ Updated index.md (Contract file)\n\nAdded content to the contract file.`,
				},
			],
		};
	}

	/**
	 * Create or update DECISIONS.md
	 */
	async createOrUpdateDecisions(args) {
		const { content, decisionTitle, replace = false } = args;
		await this.ensureProjectDir();

		const decisionsPath = join(PROJECT_DIR, 'DECISIONS.md');
		const exists = await this.fileExists(decisionsPath);

		if (!exists || replace) {
			// Create new file
			const title = decisionTitle || `Decision ${this.getCurrentDate()}`;
			const decisionsContent = `# Architecture Decisions

This document records architecture decisions, trade-offs, and rationale for this project.

## ${title}

${content}

---
*Last Updated: ${this.getCurrentDate()}*
`;
			await writeFile(decisionsPath, decisionsContent, 'utf-8');
			return {
				content: [
					{
						type: 'text',
						text: `✅ ${exists ? 'Updated' : 'Created'} DECISIONS.md\n\n${decisionsContent}`,
					},
				],
			};
		}

		// Merge with existing content
		const existingContent = await readFile(decisionsPath, 'utf-8');
		let updatedContent = existingContent;

		// Add new decision entry
		const title = decisionTitle || `Decision ${this.getCurrentDate()}`;
		
		// Try to find a good place to insert (before the "---" separator or at the end)
		if (updatedContent.includes('---')) {
			// Insert before the separator
			updatedContent = updatedContent.replace(
				/\n---\n/,
				`\n\n## ${title}\n\n${content}\n\n---\n`
			);
		} else {
			// Append to end
			updatedContent = `${updatedContent}\n\n## ${title}\n\n${content}\n`;
		}

		// Update timestamp
		updatedContent = updatedContent.replace(
			/\*Last Updated: .*\*/,
			`*Last Updated: ${this.getCurrentDate()}*`
		);
		if (!updatedContent.includes('*Last Updated:')) {
			updatedContent += `\n\n---\n*Last Updated: ${this.getCurrentDate()}*\n`;
		}

		await writeFile(decisionsPath, updatedContent, 'utf-8');
		return {
			content: [
				{
					type: 'text',
					text: `✅ Updated DECISIONS.md\n\nAdded decision: ${title}`,
				},
			],
		};
	}

	// ============================================
	// TASK MANAGEMENT SYSTEM
	// YAML frontmatter, stable IDs, dependencies
	// ============================================

	/**
	 * Get the current date in ISO format
	 */
	getISODate() {
		return new Date().toISOString().split('T')[0];
	}

	/**
	 * Generate next task ID for a project
	 */
	async getNextTaskId(project) {
		const projectUpper = project.toUpperCase();
		try {
			const files = await readdir(TODOS_DIR);
			const pattern = new RegExp(`^${projectUpper}-(\\d+)\\.md$`);
			let maxNum = 0;
			for (const file of files) {
				const match = file.match(pattern);
				if (match) {
					const num = parseInt(match[1], 10);
					if (num > maxNum) maxNum = num;
				}
			}
			return `${projectUpper}-${String(maxNum + 1).padStart(3, '0')}`;
		} catch {
			return `${projectUpper}-001`;
		}
	}

	/**
	 * Load all tasks from the todos directory
	 */
	async loadAllTasks() {
		await this.ensureTodosDir();
		const tasks = [];
		try {
			const files = await readdir(TODOS_DIR);
			for (const file of files) {
				if (file.endsWith('.md') && /^[A-Z]+-\d+\.md$/.test(file)) {
					const filePath = join(TODOS_DIR, file);
					try {
						const content = await readFile(filePath, 'utf-8');
						const parsed = matter(content);
						tasks.push({
							...parsed.data,
							content: parsed.content,
							file: file,
							path: `todos/${file}`,
						});
					} catch (error) {
						console.error(`Error reading ${filePath}:`, error.message);
					}
				}
			}
		} catch {
			// Directory might not exist
		}
		return tasks;
	}

	/**
	 * Check if a task's dependencies are all done
	 */
	areDependenciesMet(task, allTasks) {
		if (!task.depends_on || task.depends_on.length === 0) return true;
		const taskMap = new Map(allTasks.map(t => [t.id, t]));
		for (const depId of task.depends_on) {
			const dep = taskMap.get(depId);
			if (!dep || dep.status !== 'done') return false;
		}
		return true;
	}

	/**
	 * Create a new task with YAML frontmatter
	 */
	async createTask(args) {
		const {
			title,
			project,
			description = '',
			owner = 'unassigned',
			priority = 'P2',
			status = 'todo',
			depends_on = [],
			blocked_by = [],
			estimate,
			due,
			tags = [],
			subtasks = [],
		} = args;

		await this.ensureTodosDir();

		// Generate task ID
		const id = await this.getNextTaskId(project);
		const filename = `${id}.md`;
		const filePath = join(TODOS_DIR, filename);

		// Build frontmatter
		const frontmatter = {
			id,
			title,
			project: project.toUpperCase(),
			priority,
			status,
			owner,
			depends_on,
			blocked_by,
			tags,
			created: this.getISODate(),
			updated: this.getISODate(),
		};
		if (estimate) frontmatter.estimate = estimate;
		if (due) frontmatter.due = due;

		// Build content
		let content = `# ${id}: ${title}\n\n`;
		if (description) {
			content += `## Description\n\n${description}\n\n`;
		}
		if (subtasks.length > 0) {
			content += `## Subtasks\n\n`;
			for (const subtask of subtasks) {
				content += `- [ ] ${subtask}\n`;
			}
			content += '\n';
		}
		content += `## Notes\n\n`;

		// Write file with frontmatter
		const fileContent = matter.stringify(content, frontmatter);
		await writeFile(filePath, fileContent, 'utf-8');

		return {
			content: [
				{
					type: 'text',
					text: `✅ Created task **${id}**: ${title}\n\n**File:** \`todos/${filename}\`\n**Project:** ${project.toUpperCase()}\n**Priority:** ${priority}\n**Status:** ${status}\n**Owner:** ${owner}\n${depends_on.length > 0 ? `**Depends on:** ${depends_on.join(', ')}\n` : ''}${estimate ? `**Estimate:** ${estimate}\n` : ''}${due ? `**Due:** ${due}\n` : ''}${tags.length > 0 ? `**Tags:** ${tags.join(', ')}\n` : ''}\n\nUse \`update_task\` to modify this task or \`get_next_task\` to find what to work on next.`,
				},
			],
		};
	}

	/**
	 * Update an existing task
	 */
	async updateTask(args) {
		const { id, ...updates } = args;
		await this.ensureTodosDir();

		const filename = `${id.toUpperCase()}.md`;
		const filePath = join(TODOS_DIR, filename);

		if (!(await this.fileExists(filePath))) {
			return {
				content: [{ type: 'text', text: `❌ Task not found: ${id}` }],
				isError: true,
			};
		}

		const fileContent = await readFile(filePath, 'utf-8');
		const parsed = matter(fileContent);
		const data = parsed.data;
		let content = parsed.content;

		// Apply updates to frontmatter
		const changes = [];
		if (updates.title !== undefined) {
			data.title = updates.title;
			changes.push(`title → "${updates.title}"`);
		}
		if (updates.owner !== undefined) {
			data.owner = updates.owner;
			changes.push(`owner → ${updates.owner}`);
		}
		if (updates.priority !== undefined) {
			data.priority = updates.priority;
			changes.push(`priority → ${updates.priority}`);
		}
		if (updates.status !== undefined) {
			const oldStatus = data.status;
			data.status = updates.status;
			changes.push(`status → ${updates.status}`);
			if (updates.status === 'done' && oldStatus !== 'done') {
				data.completed = this.getISODate();
				changes.push(`completed → ${data.completed}`);
			}
		}
		if (updates.estimate !== undefined) {
			data.estimate = updates.estimate;
			changes.push(`estimate → ${updates.estimate}`);
		}
		if (updates.due !== undefined) {
			data.due = updates.due;
			changes.push(`due → ${updates.due}`);
		}
		if (updates.depends_on !== undefined) {
			data.depends_on = updates.depends_on;
			changes.push(`depends_on → [${updates.depends_on.join(', ')}]`);
		}
		if (updates.blocked_by !== undefined) {
			data.blocked_by = updates.blocked_by;
			changes.push(`blocked_by → [${updates.blocked_by.join(', ')}]`);
		}
		if (updates.tags !== undefined) {
			data.tags = updates.tags;
			changes.push(`tags → [${updates.tags.join(', ')}]`);
		}

		// Handle description update
		if (updates.description !== undefined) {
			if (updates.description.startsWith('append:')) {
				const toAppend = updates.description.substring(7);
				const descSection = content.match(/## Description\n\n([\s\S]*?)(?=\n## |$)/);
				if (descSection) {
					content = content.replace(
						/## Description\n\n([\s\S]*?)(?=\n## |$)/,
						`## Description\n\n${descSection[1].trim()}\n\n${toAppend}\n\n`
					);
				}
				changes.push('description appended');
			} else {
				content = content.replace(
					/## Description\n\n[\s\S]*?(?=\n## |$)/,
					`## Description\n\n${updates.description}\n\n`
				);
				changes.push('description updated');
			}
		}

		// Handle subtask operations
		if (updates.add_subtask) {
			const subtaskSection = content.match(/## Subtasks\n\n([\s\S]*?)(?=\n## |$)/);
			if (subtaskSection) {
				content = content.replace(
					/## Subtasks\n\n([\s\S]*?)(?=\n## |$)/,
					`## Subtasks\n\n${subtaskSection[1].trim()}\n- [ ] ${updates.add_subtask}\n\n`
				);
			} else {
				content = content.replace(
					/## Notes/,
					`## Subtasks\n\n- [ ] ${updates.add_subtask}\n\n## Notes`
				);
			}
			changes.push(`added subtask: ${updates.add_subtask}`);
		}

		if (updates.complete_subtask) {
			const regex = new RegExp(
				`- \\[ \\] (.*${updates.complete_subtask.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*)`
			);
			if (regex.test(content)) {
				content = content.replace(regex, '- [x] $1');
				changes.push(`completed subtask: ${updates.complete_subtask}`);
			}
		}

		// Update timestamp
		data.updated = this.getISODate();

		// Write updated file
		const newFileContent = matter.stringify(content, data);
		await writeFile(filePath, newFileContent, 'utf-8');

		return {
			content: [
				{
					type: 'text',
					text: `✅ Updated task **${id}**\n\n**Changes:**\n${changes.map(c => `- ${c}`).join('\n')}\n\n**Current state:**\n- Priority: ${data.priority}\n- Status: ${data.status}\n- Owner: ${data.owner}`,
				},
			],
		};
	}

	/**
	 * Get next task(s) to work on (dependency-aware)
	 */
	async getNextTask(args) {
		const { owner, project, include_blocked = false, limit = 5 } = args || {};

		const allTasks = await this.loadAllTasks();

		// Filter tasks
		let candidates = allTasks.filter(task => {
			// Exclude done tasks
			if (task.status === 'done') return false;
			// Exclude blocked unless requested
			if (!include_blocked && task.status === 'blocked') return false;
			// Filter by owner if specified
			if (owner && task.owner !== owner) return false;
			// Filter by project if specified
			if (project && task.project !== project.toUpperCase()) return false;
			// Check dependencies are met
			if (!this.areDependenciesMet(task, allTasks)) return false;
			return true;
		});

		// Sort by priority, then by ID
		const priorityOrder = { 'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3 };
		candidates.sort((a, b) => {
			// In-progress tasks first
			if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
			if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;
			// Then by priority
			const aPri = priorityOrder[a.priority] ?? 2;
			const bPri = priorityOrder[b.priority] ?? 2;
			if (aPri !== bPri) return aPri - bPri;
			// Then by due date if exists
			if (a.due && b.due) return a.due.localeCompare(b.due);
			if (a.due) return -1;
			if (b.due) return 1;
			// Then by ID
			return a.id.localeCompare(b.id);
		});

		candidates = candidates.slice(0, limit);

		if (candidates.length === 0) {
			return {
				content: [
					{
						type: 'text',
						text: `✅ **No tasks available!**\n\nAll tasks are either:\n- Completed\n- Blocked\n- Waiting on dependencies\n\nUse \`list_tasks\` to see all tasks or \`create_task\` to add new ones.`,
					},
				],
			};
		}

		let result = `## Next Tasks to Work On\n\n`;
		result += `*Sorted by: in-progress first, then priority (P0→P3), then due date*\n\n`;

		for (const task of candidates) {
			result += `### ${task.priority ? `[${task.priority}] ` : ''}${task.id}: ${task.title}\n\n`;
			result += `**Status:** ${task.status} | **Owner:** ${task.owner}\n`;
			if (task.estimate) result += `**Estimate:** ${task.estimate} | `;
			if (task.due) result += `**Due:** ${task.due}\n`;
			if (task.depends_on?.length > 0) {
				result += `**Depends on:** ${task.depends_on.join(', ')} ✅ (all done)\n`;
			}
			if (task.tags?.length > 0) {
				result += `**Tags:** ${task.tags.join(', ')}\n`;
			}
			result += `**File:** \`${task.path}\`\n\n`;
		}

		result += `---\n\n**Tip:** Use \`update_task\` with \`status: "in_progress"\` to start working on a task.`;

		return {
			content: [{ type: 'text', text: result }],
		};
	}

	/**
	 * List all tasks with optional filtering
	 */
	async listTasks(args) {
		const { project, owner, status, priority, tag } = args || {};

		const allTasks = await this.loadAllTasks();

		// Apply filters
		let tasks = allTasks.filter(task => {
			if (project && task.project !== project.toUpperCase()) return false;
			if (owner && task.owner !== owner) return false;
			if (status && task.status !== status) return false;
			if (priority && task.priority !== priority) return false;
			if (tag && (!task.tags || !task.tags.includes(tag))) return false;
			return true;
		});

		// Sort by status, priority, ID
		const statusOrder = { 'in_progress': 0, 'todo': 1, 'blocked': 2, 'review': 3, 'done': 4 };
		const priorityOrder = { 'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3 };
		tasks.sort((a, b) => {
			const aStatus = statusOrder[a.status] ?? 5;
			const bStatus = statusOrder[b.status] ?? 5;
			if (aStatus !== bStatus) return aStatus - bStatus;
			const aPri = priorityOrder[a.priority] ?? 2;
			const bPri = priorityOrder[b.priority] ?? 2;
			if (aPri !== bPri) return aPri - bPri;
			return a.id.localeCompare(b.id);
		});

		// Build summary
		const counts = {
			todo: tasks.filter(t => t.status === 'todo').length,
			in_progress: tasks.filter(t => t.status === 'in_progress').length,
			blocked: tasks.filter(t => t.status === 'blocked').length,
			review: tasks.filter(t => t.status === 'review').length,
			done: tasks.filter(t => t.status === 'done').length,
		};

		let result = `## Task List\n\n`;
		result += `**Total:** ${tasks.length} tasks | `;
		result += `🔵 In Progress: ${counts.in_progress} | `;
		result += `⚪ Todo: ${counts.todo} | `;
		result += `🔴 Blocked: ${counts.blocked} | `;
		result += `🟡 Review: ${counts.review} | `;
		result += `✅ Done: ${counts.done}\n\n`;

		// Group by status
		const statusEmoji = {
			'in_progress': '🔵',
			'todo': '⚪',
			'blocked': '🔴',
			'review': '🟡',
			'done': '✅',
		};

		for (const s of ['in_progress', 'todo', 'blocked', 'review', 'done']) {
			const statusTasks = tasks.filter(t => t.status === s);
			if (statusTasks.length > 0) {
				result += `### ${statusEmoji[s]} ${s.replace('_', ' ').toUpperCase()} (${statusTasks.length})\n\n`;
				result += `| ID | P | Title | Owner | Due |\n`;
				result += `|----|---|-------|-------|-----|\n`;
				for (const task of statusTasks) {
					result += `| ${task.id} | ${task.priority} | ${task.title.substring(0, 40)}${task.title.length > 40 ? '...' : ''} | ${task.owner} | ${task.due || '-'} |\n`;
				}
				result += '\n';
			}
		}

		return {
			content: [{ type: 'text', text: result }],
		};
	}

	/**
	 * Sync parent TODO.md with all tasks (new format)
	 */
	async syncTodoIndex(args) {
		const { format = 'dashboard' } = args || {};
		await this.ensureProjectDir();

		const tasks = await this.loadAllTasks();
		const todoPath = join(PROJECT_DIR, 'TODO.md');

		// Calculate stats
		const counts = {
			total: tasks.length,
			todo: tasks.filter(t => t.status === 'todo').length,
			in_progress: tasks.filter(t => t.status === 'in_progress').length,
			blocked: tasks.filter(t => t.status === 'blocked').length,
			review: tasks.filter(t => t.status === 'review').length,
			done: tasks.filter(t => t.status === 'done').length,
		};

		const priorityCounts = {
			P0: tasks.filter(t => t.priority === 'P0' && t.status !== 'done').length,
			P1: tasks.filter(t => t.priority === 'P1' && t.status !== 'done').length,
			P2: tasks.filter(t => t.priority === 'P2' && t.status !== 'done').length,
			P3: tasks.filter(t => t.priority === 'P3' && t.status !== 'done').length,
		};

		// Find next actionable tasks
		const actionable = tasks
			.filter(t => t.status !== 'done' && t.status !== 'blocked' && this.areDependenciesMet(t, tasks))
			.sort((a, b) => {
				const prio = { 'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3 };
				return (prio[a.priority] ?? 2) - (prio[b.priority] ?? 2);
			})
			.slice(0, 5);

		let content = `# TODO Dashboard

**Last Updated:** ${this.getCurrentDate()}

## Overview

| Status | Count | | Priority | Active |
|--------|-------|-|----------|--------|
| 🔵 In Progress | ${counts.in_progress} | | 🔴 P0 (Critical) | ${priorityCounts.P0} |
| ⚪ Todo | ${counts.todo} | | 🟠 P1 (High) | ${priorityCounts.P1} |
| 🔴 Blocked | ${counts.blocked} | | 🟡 P2 (Medium) | ${priorityCounts.P2} |
| 🟡 Review | ${counts.review} | | 🟢 P3 (Low) | ${priorityCounts.P3} |
| ✅ Done | ${counts.done} | | | |
| **Total** | **${counts.total}** | | **Active** | **${counts.total - counts.done}** |

## 🎯 Next Up (Dependency-Ready)

`;

		if (actionable.length > 0) {
			content += `| Priority | ID | Title | Owner | Status |\n`;
			content += `|----------|-------|-------|-------|--------|\n`;
			for (const task of actionable) {
				content += `| ${task.priority} | [${task.id}](todos/${task.id}.md) | ${task.title.substring(0, 35)}${task.title.length > 35 ? '...' : ''} | ${task.owner} | ${task.status} |\n`;
			}
		} else {
			content += `*No actionable tasks available. All tasks are either done, blocked, or waiting on dependencies.*\n`;
		}

		// In Progress section
		const inProgress = tasks.filter(t => t.status === 'in_progress');
		content += `\n## 🔵 In Progress (${inProgress.length})\n\n`;
		if (inProgress.length > 0) {
			for (const task of inProgress) {
				content += `- **[${task.id}](todos/${task.id}.md)** ${task.title} — *${task.owner}*\n`;
			}
		} else {
			content += `*No tasks in progress.*\n`;
		}

		// Blocked section
		const blocked = tasks.filter(t => t.status === 'blocked');
		if (blocked.length > 0) {
			content += `\n## 🔴 Blocked (${blocked.length})\n\n`;
			for (const task of blocked) {
				const blockers = task.blocked_by?.length > 0 ? `Blocked by: ${task.blocked_by.join(', ')}` : '';
				content += `- **[${task.id}](todos/${task.id}.md)** ${task.title} ${blockers}\n`;
			}
		}

		// Projects summary
		const projects = [...new Set(tasks.map(t => t.project))];
		if (projects.length > 0) {
			content += `\n## 📁 Projects\n\n`;
			for (const proj of projects) {
				const projTasks = tasks.filter(t => t.project === proj);
				const projDone = projTasks.filter(t => t.status === 'done').length;
				content += `- **${proj}**: ${projDone}/${projTasks.length} done\n`;
			}
		}

		content += `\n---\n\n*This file is auto-generated by \`sync_todo_index\`. Tasks are managed in \`.project/todos/\` with YAML frontmatter.*\n`;
		content += `\n**Tools:** \`create_task\` | \`update_task\` | \`get_next_task\` | \`list_tasks\`\n`;

		await writeFile(todoPath, content, 'utf-8');

		return {
			content: [
				{
					type: 'text',
					text: `✅ Synced TODO.md dashboard\n\n**Summary:**\n- Total: ${counts.total} tasks\n- Active: ${counts.total - counts.done}\n- In Progress: ${counts.in_progress}\n- Blocked: ${counts.blocked}\n- Done: ${counts.done}\n\n**Next actionable:** ${actionable.length > 0 ? actionable.map(t => t.id).join(', ') : 'None'}`,
				},
			],
		};
	}

	/**
	 * Lint project documentation for standards compliance
	 */
	async lintProjectDocs(args) {
		const { fix = false, strict = false, scope = 'all' } = args || {};
		await this.ensureProjectDir();

		const issues = [];
		const fixed = [];
		const warnings = [];

		// Define required documentation files
		const requiredDocs = [
			{ file: 'index.md', name: 'Contract file', required: ['# ', 'Intent'] },
			{ file: 'TODO.md', name: 'Todo index', required: ['# TODO'] },
			{ file: 'ROADMAP.md', name: 'Roadmap', required: ['# '] },
			{ file: 'STATUS.md', name: 'Status', required: ['# '] },
			{ file: 'DECISIONS.md', name: 'Decisions log', required: ['# '] },
		];

		// Check documentation files
		if (scope === 'all' || scope === 'docs') {
			for (const doc of requiredDocs) {
				const docPath = join(PROJECT_DIR, doc.file);
				const exists = await this.fileExists(docPath);

				if (!exists) {
					issues.push({
						type: 'error',
						file: doc.file,
						message: `Missing required file: ${doc.name}`,
						fix: `Run the appropriate create_or_update_* tool to create ${doc.file}`,
					});
				} else {
					const content = await readFile(docPath, 'utf-8');

					// Check for required content patterns
					for (const pattern of doc.required) {
						if (!content.includes(pattern)) {
							warnings.push({
								type: 'warning',
								file: doc.file,
								message: `Missing expected content pattern: "${pattern}"`,
							});
						}
					}

					// Check for timestamp
					if (!content.includes('Last Updated:') && !content.includes('updated:')) {
						if (fix) {
							const updatedContent = content + `\n\n---\n*Last Updated: ${this.getCurrentDate()}*\n`;
							await writeFile(docPath, updatedContent, 'utf-8');
							fixed.push({ file: doc.file, action: 'Added timestamp' });
						} else {
							issues.push({
								type: 'warning',
								file: doc.file,
								message: 'Missing timestamp',
								fix: 'Add *Last Updated: DATE* to the file',
							});
						}
					}
				}
			}
		}

		// Check task files
		if (scope === 'all' || scope === 'tasks') {
			const tasks = await this.loadAllTasks();
			const taskIds = new Set(tasks.map(t => t.id));

			// Required task fields
			const requiredFields = ['id', 'title', 'project', 'status', 'priority'];
			const strictFields = ['owner', 'estimate', 'description'];
			const validStatuses = ['todo', 'in_progress', 'blocked', 'review', 'done'];
			const validPriorities = ['P0', 'P1', 'P2', 'P3'];

			for (const task of tasks) {
				const taskFile = `todos/${task.file}`;

				// Check required fields
				for (const field of requiredFields) {
					if (!task[field]) {
						issues.push({
							type: 'error',
							file: taskFile,
							message: `Missing required field: ${field}`,
							fix: `Add ${field} to frontmatter`,
						});
					}
				}

				// Strict mode checks
				if (strict) {
					for (const field of strictFields) {
						if (!task[field]) {
							warnings.push({
								type: 'warning',
								file: taskFile,
								message: `Missing recommended field: ${field} (strict mode)`,
							});
						}
					}
				}

				// Validate status
				if (task.status && !validStatuses.includes(task.status)) {
					issues.push({
						type: 'error',
						file: taskFile,
						message: `Invalid status: "${task.status}". Must be one of: ${validStatuses.join(', ')}`,
						fix: 'Update status to a valid value',
					});
				}

				// Validate priority
				if (task.priority && !validPriorities.includes(task.priority)) {
					if (fix) {
						// Auto-fix priority
						const normalized = this.normalizePriorityValue(task.priority);
						const filePath = join(TODOS_DIR, task.file);
						let content = await readFile(filePath, 'utf-8');
						content = content.replace(
							/priority:\s*.+/,
							`priority: ${normalized}`
						);
						await writeFile(filePath, content, 'utf-8');
						fixed.push({ file: taskFile, action: `Normalized priority to ${normalized}` });
					} else {
						issues.push({
							type: 'error',
							file: taskFile,
							message: `Invalid priority: "${task.priority}". Must be one of: ${validPriorities.join(', ')}`,
							fix: 'Use P0, P1, P2, or P3',
						});
					}
				}

				// Check for broken dependencies
				if (task.depends_on && Array.isArray(task.depends_on)) {
					for (const depId of task.depends_on) {
						if (!taskIds.has(depId)) {
							issues.push({
								type: 'error',
								file: taskFile,
								message: `Broken dependency: "${depId}" does not exist`,
								fix: `Remove ${depId} from depends_on or create the missing task`,
							});
						}
					}
				}

				// Check for circular dependencies
				if (task.depends_on && task.depends_on.includes(task.id)) {
					issues.push({
						type: 'error',
						file: taskFile,
						message: 'Circular dependency: task depends on itself',
						fix: 'Remove self-reference from depends_on',
					});
				}

				// Check for missing updated timestamp
				if (!task.updated) {
					if (fix) {
						const filePath = join(TODOS_DIR, task.file);
						let content = await readFile(filePath, 'utf-8');
						if (content.includes('created:') && !content.includes('updated:')) {
							content = content.replace(
								/(created:\s*.+)/,
								`$1\nupdated: ${this.getISODate()}`
							);
							await writeFile(filePath, content, 'utf-8');
							fixed.push({ file: taskFile, action: 'Added updated timestamp' });
						}
					} else {
						warnings.push({
							type: 'warning',
							file: taskFile,
							message: 'Missing updated timestamp in frontmatter',
						});
					}
				}

				// Check ID matches filename
				const expectedFilename = `${task.id}.md`;
				if (task.file !== expectedFilename) {
					issues.push({
						type: 'error',
						file: taskFile,
						message: `Filename "${task.file}" doesn't match task ID "${task.id}"`,
						fix: `Rename file to ${expectedFilename}`,
					});
				}

				// Check due date format if present
				if (task.due && !/^\d{4}-\d{2}-\d{2}$/.test(task.due)) {
					issues.push({
						type: 'warning',
						file: taskFile,
						message: `Invalid due date format: "${task.due}". Expected YYYY-MM-DD`,
						fix: 'Update due date to YYYY-MM-DD format',
					});
				}

				// Check for overdue tasks
				if (task.due && task.status !== 'done') {
					const dueDate = new Date(task.due);
					const today = new Date();
					today.setHours(0, 0, 0, 0);
					if (dueDate < today) {
						warnings.push({
							type: 'warning',
							file: taskFile,
							message: `Task is overdue (due: ${task.due})`,
						});
					}
				}
			}

			// Check for orphaned tasks (done tasks that others depend on)
			for (const task of tasks) {
				if (task.status === 'done' && task.depends_on?.length > 0) {
					const unresolvedDeps = task.depends_on.filter(depId => {
						const dep = tasks.find(t => t.id === depId);
						return dep && dep.status !== 'done';
					});
					if (unresolvedDeps.length > 0) {
						warnings.push({
							type: 'warning',
							file: `todos/${task.file}`,
							message: `Task marked done but has unresolved dependencies: ${unresolvedDeps.join(', ')}`,
						});
					}
				}
			}
		}

		// Build result
		const errorCount = issues.filter(i => i.type === 'error').length;
		const warningCount = issues.filter(i => i.type === 'warning').length + warnings.length;

		let result = `## Documentation Lint Results\n\n`;
		result += `**Scope:** ${scope} | **Strict:** ${strict} | **Auto-fix:** ${fix}\n\n`;

		if (errorCount === 0 && warningCount === 0) {
			result += `✅ **All checks passed!** Documentation conforms to standards.\n`;
		} else {
			result += `| Type | Count |\n|------|-------|\n`;
			result += `| 🔴 Errors | ${errorCount} |\n`;
			result += `| 🟡 Warnings | ${warningCount} |\n\n`;
		}

		if (fixed.length > 0) {
			result += `### ✅ Auto-fixed (${fixed.length})\n\n`;
			for (const f of fixed) {
				result += `- \`${f.file}\`: ${f.action}\n`;
			}
			result += '\n';
		}

		if (issues.length > 0) {
			result += `### 🔴 Issues\n\n`;
			for (const issue of issues) {
				result += `**${issue.file}**\n`;
				result += `- ${issue.type === 'error' ? '❌' : '⚠️'} ${issue.message}\n`;
				if (issue.fix) result += `  - Fix: ${issue.fix}\n`;
				result += '\n';
			}
		}

		if (warnings.length > 0) {
			result += `### 🟡 Warnings\n\n`;
			for (const warn of warnings) {
				result += `- \`${warn.file}\`: ${warn.message}\n`;
			}
			result += '\n';
		}

		if (errorCount > 0) {
			result += `---\n\n⚠️ **${errorCount} error(s) found.** Run with \`fix: true\` to auto-fix where possible.\n`;
		}

		return {
			content: [{ type: 'text', text: result }],
		};
	}

	/**
	 * Initialize .project/ directory with standard files
	 */
	async initProject(args) {
		const { project_name, project_description = '', overwrite = false } = args;
		const date = this.getCurrentDate();

		const files = [];
		const skipped = [];

		// Ensure directories exist
		await this.ensureProjectDir();
		await this.ensureTodosDir();

		// Standard file templates
		const templates = {
			'index.md': `---
title: ${project_name} - Project Index
created: ${this.getISODate()}
updated: ${this.getISODate()}
---

# ${project_name}

${project_description}

## Contract for AI Agents

When a user says **"project"**, **"the project"**, or **"my project"**, the canonical sources of truth are:

1. **\`.project/\`** — Current state, plans, todos, decisions (operational truth)
2. **Root markdown files** — README.md, CONTRIBUTING.md, etc.
3. **\`docs/\`** — Long-form reference documentation

## Source Mappings

### "project" / "the project"
Searches: \`.project/\` + root files + \`docs/\`

### "docs" / "documentation"
Searches: \`docs/\` only

### "plan" / "todos" / "roadmap" / "status"
Searches: \`.project/\` only

## File Structure

| File | Purpose |
|------|---------|
| \`index.md\` | This file - contract and source mappings |
| \`TODO.md\` | Task dashboard (auto-generated) |
| \`ROADMAP.md\` | Project phases and milestones |
| \`STATUS.md\` | Current project health and progress |
| \`DECISIONS.md\` | Architecture decisions and rationale |
| \`todos/\` | Individual task files with YAML frontmatter |

## Principles

- **Natural language stays natural** — Users say "project" not ".project/"
- **Agents don't guess** — Explicit mappings defined here
- **Intent over structure** — Language maps to intent, not directory names
- **Operational truth** — This directory is the source of truth for current state

---
*Last Updated: ${date}*
`,

			'ROADMAP.md': `---
title: ${project_name} - Roadmap
created: ${this.getISODate()}
updated: ${this.getISODate()}
---

# Roadmap

## Overview

${project_description || 'Project roadmap and milestones.'}

## Phases

### Phase 1: Foundation
**Status:** Not Started
**Target:** TBD

- [ ] Initial setup
- [ ] Core infrastructure
- [ ] Basic functionality

### Phase 2: Core Features
**Status:** Not Started
**Target:** TBD

- [ ] Feature development
- [ ] Testing
- [ ] Documentation

### Phase 3: Polish & Launch
**Status:** Not Started
**Target:** TBD

- [ ] Bug fixes
- [ ] Performance optimization
- [ ] Launch preparation

## Milestones

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| MVP | TBD | Not Started |
| Beta | TBD | Not Started |
| v1.0 | TBD | Not Started |

## Future Considerations

- Future feature ideas
- Technical debt items
- Nice-to-have improvements

---
*Last Updated: ${date}*
`,

			'STATUS.md': `---
title: ${project_name} - Status
created: ${this.getISODate()}
updated: ${this.getISODate()}
---

# Project Status

**Last Updated:** ${date}

## Current Phase

**Foundation** — Initial setup and planning

## Health

🟡 **Yellow** — Project initialized, work not yet started

## Progress

| Area | Status | Notes |
|------|--------|-------|
| Planning | 🟢 In Progress | Setting up project structure |
| Development | ⚪ Not Started | |
| Testing | ⚪ Not Started | |
| Documentation | 🟢 In Progress | Initial docs created |

## Recent Changes

- ✅ Initialized project structure
- ✅ Created standard documentation files
- 📋 Ready for planning phase

## Active Work

None yet — see TODO.md for task dashboard

## Blockers

None currently

## Next Steps

1. Define project requirements
2. Create initial tasks using \`create_task\`
3. Begin Phase 1 development

---
*Last Updated: ${date}*
`,

			'DECISIONS.md': `---
title: ${project_name} - Architecture Decisions
created: ${this.getISODate()}
updated: ${this.getISODate()}
---

# Architecture Decisions

This document records architecture decisions, trade-offs, and rationale for ${project_name}.

## Decision Log

### ADR-001: Project Structure
**Date:** ${date}
**Status:** Accepted

**Context:**
Need a standard way to organize project documentation and tasks.

**Decision:**
Use \`.project/\` directory with:
- YAML frontmatter for task metadata
- Jira-like task IDs ({PROJECT}-{NNN})
- Dependency tracking between tasks

**Consequences:**
- Consistent structure across projects
- Machine-readable task metadata
- Clear separation of operational vs reference docs

---

## Template for New Decisions

\`\`\`markdown
### ADR-XXX: Title
**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded

**Context:**
What is the issue that we're seeing that is motivating this decision?

**Decision:**
What is the change that we're proposing and/or doing?

**Consequences:**
What becomes easier or more difficult to do because of this change?
\`\`\`

---
*Last Updated: ${date}*
`,

			'TODO.md': `---
title: ${project_name} - Task Dashboard
created: ${this.getISODate()}
updated: ${this.getISODate()}
---

# TODO Dashboard

**Last Updated:** ${date}

## Overview

| Status | Count |
|--------|-------|
| 🔵 In Progress | 0 |
| ⚪ Todo | 0 |
| 🔴 Blocked | 0 |
| ✅ Done | 0 |

## 🎯 Next Up

*No tasks yet. Create tasks using \`create_task\` tool.*

## Getting Started

1. **Create tasks:** Use \`create_task\` with project, title, and priority
2. **View next task:** Use \`get_next_task\` to see what to work on
3. **Update status:** Use \`update_task\` to transition task status
4. **Sync dashboard:** Use \`sync_todo_index\` to refresh this file

### Example: Create a Task

\`\`\`json
{
  "tool": "create_task",
  "arguments": {
    "title": "Set up development environment",
    "project": "${project_name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6) || 'PROJ'}",
    "priority": "P1",
    "owner": "developer"
  }
}
\`\`\`

---
*This file is auto-generated by \`sync_todo_index\`. Tasks are in \`.project/todos/\`.*
`,
		};

		// Create each file
		for (const [filename, content] of Object.entries(templates)) {
			const filePath = join(PROJECT_DIR, filename);
			const exists = await this.fileExists(filePath);

			if (exists && !overwrite) {
				skipped.push(filename);
				continue;
			}

			await writeFile(filePath, content, 'utf-8');
			files.push({ file: filename, action: exists ? 'overwritten' : 'created' });
		}

		// Create .gitkeep in todos/ if empty
		const todosGitkeep = join(TODOS_DIR, '.gitkeep');
		if (!(await this.fileExists(todosGitkeep))) {
			await writeFile(todosGitkeep, '', 'utf-8');
		}

		let result = `## Project Initialized: ${project_name}\n\n`;
		result += `**Location:** \`.project/\`\n\n`;

		if (files.length > 0) {
			result += `### Files Created\n\n`;
			for (const f of files) {
				result += `- ✅ \`${f.file}\` (${f.action})\n`;
			}
			result += `- ✅ \`todos/\` directory\n\n`;
		}

		if (skipped.length > 0) {
			result += `### Files Skipped (already exist)\n\n`;
			for (const f of skipped) {
				result += `- ⏭️ \`${f}\`\n`;
			}
			result += `\n*Use \`overwrite: true\` to replace existing files.*\n\n`;
		}

		result += `### Next Steps\n\n`;
		result += `1. Review and customize \`.project/ROADMAP.md\`\n`;
		result += `2. Create tasks with \`create_task\`\n`;
		result += `3. Import tasks from roadmap with \`import_tasks\`\n`;
		result += `4. Run \`lint_project_docs\` to validate structure\n`;

		return {
			content: [{ type: 'text', text: result }],
		};
	}

	/**
	 * Import tasks from a plan document
	 */
	async importTasks(args) {
		const {
			source,
			source_type = 'file',
			project,
			default_owner = 'unassigned',
			default_priority = 'P2',
			dry_run = false,
		} = args;

		await this.ensureTodosDir();

		// Get content
		let content;
		if (source_type === 'file') {
			// Try multiple locations
			const locations = [
				source,
				join(PROJECT_ROOT, source),
				join(PROJECT_DIR, source),
			];
			let found = false;
			for (const loc of locations) {
				if (await this.fileExists(loc)) {
					content = await readFile(loc, 'utf-8');
					found = true;
					break;
				}
			}
			if (!found) {
				return {
					content: [{ type: 'text', text: `❌ File not found: ${source}` }],
					isError: true,
				};
			}
		} else {
			content = source;
		}

		// Parse tasks from content
		const tasks = this.parseTasksFromContent(content, project.toUpperCase(), default_priority);

		if (tasks.length === 0) {
			return {
				content: [{
					type: 'text',
					text: `⚠️ No tasks found in the source.\n\nThe parser looks for:\n- Markdown lists with \`[ ]\` or \`- \` items\n- Phase/section headers (## or ###)\n- Structured content with clear task items`,
				}],
			};
		}

		// Assign owners and IDs
		const projectPrefix = project.toUpperCase();
		const existingIds = new Set();
		
		// Get existing task IDs
		try {
			const files = await readdir(TODOS_DIR);
			for (const file of files) {
				const match = file.match(/^([A-Z]+-\d+)\.md$/);
				if (match) existingIds.add(match[1]);
			}
		} catch {
			// Directory might not exist
		}

		// Assign sequential IDs
		let nextNum = 1;
		for (const task of tasks) {
			while (existingIds.has(`${projectPrefix}-${String(nextNum).padStart(3, '0')}`)) {
				nextNum++;
			}
			task.id = `${projectPrefix}-${String(nextNum).padStart(3, '0')}`;
			task.owner = default_owner;
			existingIds.add(task.id);
			nextNum++;
		}

		// Infer dependencies from structure (tasks in same section depend on previous)
		let lastParentId = null;
		for (let i = 0; i < tasks.length; i++) {
			const task = tasks[i];
			if (task.isParent) {
				lastParentId = task.id;
			} else if (lastParentId && task.phase === tasks.find(t => t.id === lastParentId)?.phase) {
				// Child tasks depend on parent
				task.depends_on = [lastParentId];
			}
		}

		let result = `## Import Preview\n\n`;
		result += `**Source:** ${source_type === 'file' ? source : '(inline content)'}\n`;
		result += `**Project:** ${projectPrefix}\n`;
		result += `**Tasks Found:** ${tasks.length}\n\n`;

		if (dry_run) {
			result += `### Tasks to Create (Dry Run)\n\n`;
			result += `| ID | Priority | Title | Phase | Deps |\n`;
			result += `|----|----------|-------|-------|------|\n`;
			for (const task of tasks) {
				result += `| ${task.id} | ${task.priority} | ${task.title.substring(0, 40)}${task.title.length > 40 ? '...' : ''} | ${task.phase || '-'} | ${task.depends_on?.join(', ') || '-'} |\n`;
			}
			result += `\n*This is a dry run. Run with \`dry_run: false\` to create files.*\n`;
		} else {
			// Create task files
			const created = [];
			for (const task of tasks) {
				const filename = `${task.id}.md`;
				const filePath = join(TODOS_DIR, filename);

				const frontmatter = {
					id: task.id,
					title: task.title,
					project: projectPrefix,
					priority: task.priority,
					status: 'todo',
					owner: task.owner,
					depends_on: task.depends_on || [],
					blocked_by: [],
					tags: task.tags || [],
					created: this.getISODate(),
					updated: this.getISODate(),
				};
				if (task.phase) frontmatter.phase = task.phase;

				let taskContent = `# ${task.id}: ${task.title}\n\n`;
				taskContent += `## Description\n\n${task.description || 'Imported from plan.'}\n\n`;
				if (task.subtasks && task.subtasks.length > 0) {
					taskContent += `## Subtasks\n\n`;
					for (const sub of task.subtasks) {
						taskContent += `- [ ] ${sub}\n`;
					}
					taskContent += '\n';
				}
				taskContent += `## Notes\n\n`;

				const fileContent = matter.stringify(taskContent, frontmatter);
				await writeFile(filePath, fileContent, 'utf-8');
				created.push(task);
			}

			result += `### Tasks Created\n\n`;
			result += `| ID | Priority | Title |\n`;
			result += `|----|----------|-------|\n`;
			for (const task of created) {
				result += `| ${task.id} | ${task.priority} | ${task.title.substring(0, 50)}${task.title.length > 50 ? '...' : ''} |\n`;
			}

			result += `\n✅ **${created.length} tasks created** in \`.project/todos/\`\n\n`;
			result += `### Next Steps\n\n`;
			result += `1. Run \`sync_todo_index\` to update the dashboard\n`;
			result += `2. Use \`get_next_task\` to see what to work on\n`;
			result += `3. Run \`lint_project_docs\` to validate\n`;
		}

		return {
			content: [{ type: 'text', text: result }],
		};
	}

	/**
	 * Parse tasks from markdown content
	 */
	parseTasksFromContent(content, project, defaultPriority) {
		const tasks = [];
		const lines = content.split('\n');
		
		let currentPhase = null;
		let currentSection = null;
		let currentParent = null;

		// Priority keywords
		const priorityKeywords = {
			'critical': 'P0', 'blocker': 'P0', 'urgent': 'P0',
			'high': 'P1', 'important': 'P1',
			'medium': 'P2', 'normal': 'P2',
			'low': 'P3', 'minor': 'P3', 'nice-to-have': 'P3',
		};

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmed = line.trim();

			// Detect phase/section headers
			const h2Match = trimmed.match(/^##\s+(.+)/);
			const h3Match = trimmed.match(/^###\s+(.+)/);

			if (h2Match) {
				currentPhase = h2Match[1].replace(/[*_]/g, '').trim();
				currentSection = null;
				currentParent = null;
				continue;
			}
			if (h3Match) {
				currentSection = h3Match[1].replace(/[*_]/g, '').trim();
				currentParent = null;
				continue;
			}

			// Detect task items
			const taskMatch = trimmed.match(/^[-*]\s*\[[ x]\]\s*(.+)/) || trimmed.match(/^[-*]\s+(.+)/);
			
			if (taskMatch) {
				let title = taskMatch[1].trim();
				
				// Skip if it's just a continuation or empty
				if (!title || title.length < 3) continue;
				
				// Skip common non-task items
				if (/^(note:|see:|ref:|link:)/i.test(title)) continue;

				// Detect priority from keywords
				let priority = defaultPriority;
				const titleLower = title.toLowerCase();
				for (const [keyword, pri] of Object.entries(priorityKeywords)) {
					if (titleLower.includes(keyword)) {
						priority = pri;
						break;
					}
				}

				// Check indentation for subtasks
				const indent = line.search(/\S/);
				const isSubtask = indent > 2 && currentParent;

				if (isSubtask && currentParent) {
					// Add as subtask to parent
					const parent = tasks.find(t => t.tempId === currentParent);
					if (parent) {
						parent.subtasks = parent.subtasks || [];
						parent.subtasks.push(title);
					}
				} else {
					// Create new task
					const task = {
						tempId: `temp-${tasks.length}`,
						title: title,
						priority: priority,
						phase: currentPhase,
						section: currentSection,
						isParent: indent <= 2,
						subtasks: [],
						tags: [],
					};

					// Extract tags from brackets
					const tagMatch = title.match(/\[([^\]]+)\]/g);
					if (tagMatch) {
						task.tags = tagMatch.map(t => t.slice(1, -1).toLowerCase());
						task.title = title.replace(/\[[^\]]+\]/g, '').trim();
					}

					tasks.push(task);
					currentParent = task.tempId;
				}
			}
		}

		return tasks;
	}

	/**
	 * Normalize priority value to standard P0-P3 format
	 */
	normalizePriorityValue(priority) {
		if (!priority) return 'P2';
		const upper = String(priority).toUpperCase();
		if (upper === 'CRITICAL' || upper === 'HIGHEST' || upper === 'P0') return 'P0';
		if (upper === 'HIGH' || upper === 'P1') return 'P1';
		if (upper === 'MEDIUM' || upper === 'NORMAL' || upper === 'P2') return 'P2';
		if (upper === 'LOW' || upper === 'LOWEST' || upper === 'P3') return 'P3';
		if (/^P[0-3]$/.test(upper)) return upper;
		return 'P2';
	}

	async run() {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		console.error(`Project MCP server running on stdio`);
		console.error(`Sources: .project/ (operational), root files, docs/ (reference)`);
	}
}

const server = new ProjectMCPServer();
server.run().catch(console.error);
