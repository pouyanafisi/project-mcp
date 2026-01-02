/**
 * Prompt definitions for the MCP server.
 * These prompts help agents discover and use tools appropriately.
 *
 * NAMING CONVENTION: Use snake_case matching tool names where there's a 1:1 mapping.
 * For multi-tool prompts, use descriptive snake_case names.
 */

/**
 * Mapping of prompts to the tools they invoke.
 * Used for validation and documentation.
 * @type {Record<string, string[]>}
 */
export const promptToolMapping = {
	project_overview: ['check_project_state', 'search_project', 'list_tasks', 'get_backlog'],
	get_next_task: ['get_next_task'],
	init_project: ['init_project'],
	import_tasks: ['import_tasks'],
	promote_task: ['promote_task', 'update_task'],
	lint_project: ['lint_project_docs'],
	list_tasks: ['list_tasks'],
	update_task: ['update_task'],
	add_to_backlog: ['add_to_backlog'],
	get_backlog: ['get_backlog'],
	add_decision: ['add_decision'],
	update_status: ['update_project_status'],
	update_project_docs: ['search_project', 'get_doc', 'add_decision', 'list_docs'],
};

/**
 * All available prompts
 * @type {Array<{name: string, description: string, arguments: Array}>}
 */
export const prompts = [
	{
		name: 'project_overview',
		description:
			'Get an overview of the project, its status, and what work is in progress. Use when user asks "tell me about this project", "what is this project", "project status", or "what\'s going on".',
		arguments: [],
	},
	{
		name: 'get_next_task',
		description:
			'Find the next task to work on based on priorities and dependencies. Use when user asks "what should I do", "what\'s next", "what to work on", or "next task".',
		arguments: [
			{
				name: 'owner',
				description: 'Filter by owner/assignee (optional)',
				required: false,
			},
		],
	},
	{
		name: 'init_project',
		description:
			'Initialize a new project with standard documentation structure. Use when user says "start a project", "new project", "initialize project", or "set up project docs".',
		arguments: [
			{
				name: 'project_name',
				description: 'Name of the project',
				required: true,
			},
			{
				name: 'description',
				description: 'Brief project description',
				required: false,
			},
		],
	},
	{
		name: 'import_tasks',
		description:
			'Import tasks from a roadmap or plan document into BACKLOG.md. Use when user says "import tasks", "add tasks from roadmap", "populate backlog", or "convert plan to tasks".',
		arguments: [
			{
				name: 'source_file',
				description: 'Path to the source file (e.g., ROADMAP.md)',
				required: true,
			},
			{
				name: 'project_prefix',
				description: 'Project prefix for task IDs (e.g., AUTH, API)',
				required: true,
			},
		],
	},
	{
		name: 'promote_task',
		description:
			'Promote a task from backlog to active work. Use when user says "start task", "work on X", "begin task", or "activate task".',
		arguments: [
			{
				name: 'task_id',
				description: 'The task ID to start (e.g., AUTH-001)',
				required: true,
			},
		],
	},
	{
		name: 'lint_project',
		description:
			'Validate project documentation and check for issues. Use when user says "lint project", "check project files", "validate docs", or "project health check".',
		arguments: [
			{
				name: 'fix_issues',
				description: 'Whether to auto-fix issues (true/false)',
				required: false,
			},
		],
	},
	{
		name: 'list_tasks',
		description:
			'Show all tasks with their status. Use when user asks "show tasks", "list todos", "what tasks exist", or "task list".',
		arguments: [
			{
				name: 'status_filter',
				description: 'Filter by status (todo, in_progress, blocked, done)',
				required: false,
			},
		],
	},
	{
		name: 'update_task',
		description:
			'Update the status of a task. Use when user says "mark task done", "complete task", "task is blocked", or "start task".',
		arguments: [
			{
				name: 'task_id',
				description: 'The task ID to update',
				required: true,
			},
			{
				name: 'new_status',
				description: 'New status (todo, in_progress, blocked, review, done)',
				required: true,
			},
		],
	},
	{
		name: 'add_to_backlog',
		description:
			'Add a single item to the backlog. Use when user says "add to backlog", "queue this task", "backlog item", or "add future task".',
		arguments: [
			{
				name: 'title',
				description: 'Title/description of the backlog item',
				required: true,
			},
			{
				name: 'project',
				description: 'Project prefix (e.g., AUTH, API)',
				required: true,
			},
			{
				name: 'priority',
				description: 'Priority level (P0, P1, P2, P3)',
				required: false,
			},
		],
	},
	{
		name: 'get_backlog',
		description:
			'View the current backlog. Use when user asks "show backlog", "what\'s in the queue", "backlog items", or "pending tasks".',
		arguments: [
			{
				name: 'priority',
				description: 'Filter by priority (P0, P1, P2, P3)',
				required: false,
			},
		],
	},
	{
		name: 'add_decision',
		description:
			'Record an architecture decision. Use when user says "record decision", "document decision", "ADR", or "architecture decision".',
		arguments: [
			{
				name: 'title',
				description: 'Title of the decision',
				required: true,
			},
			{
				name: 'decision',
				description: 'The decision that was made',
				required: true,
			},
		],
	},
	{
		name: 'update_status',
		description:
			'Update project status. Use when user says "update status", "project status", "status update", or "how\'s the project".',
		arguments: [
			{
				name: 'status',
				description: 'Current status summary',
				required: true,
			},
			{
				name: 'health',
				description: 'Project health (green, yellow, red)',
				required: false,
			},
		],
	},
	{
		name: 'update_project_docs',
		description:
			'Update project documentation - the APPLICATION documentation that explains how the system works. Use when user says "update project docs", "update project documents", "update project documentation", "update application docs", or "document this". This is DIFFERENT from project management (status, todos, roadmap) - this updates the docs/ folder and DECISIONS.md which contain reference documentation about the application itself.',
		arguments: [
			{
				name: 'content',
				description:
					'What to document or update. The model will determine whether this belongs in docs/ (application documentation) or DECISIONS.md (architecture decisions).',
				required: true,
			},
			{
				name: 'doc_type',
				description:
					'Hint for documentation type: "decision" for architecture decisions (DECISIONS.md), "release" for release notes, "guide" for user guides, "api" for API docs, or "auto" to let the model decide based on content.',
				required: false,
			},
		],
	},
];

/**
 * Get all prompt names
 * @returns {string[]}
 */
export function getPromptNames() {
	return prompts.map(p => p.name);
}

/**
 * Get tools used by a prompt
 * @param {string} promptName
 * @returns {string[]}
 */
export function getToolsForPrompt(promptName) {
	return promptToolMapping[promptName] || [];
}
