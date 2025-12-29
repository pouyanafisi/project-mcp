#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
	ListResourcesRequestSchema,
	ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFile, readdir, stat } from 'fs/promises';
import { join, extname, dirname, basename } from 'path';
import Fuse from 'fuse.js';
import matter from 'gray-matter';
import { lookup } from 'mime-types';

// Source directories
const PROJECT_ROOT = process.cwd();
const DOCS_DIR = process.env.DOCS_DIR || join(PROJECT_ROOT, 'docs');
const PROJECT_DIR = join(PROJECT_ROOT, '.project');

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

	async run() {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		console.error(`Project MCP server running on stdio`);
		console.error(`Sources: .project/ (operational), root files, docs/ (reference)`);
	}
}

const server = new ProjectMCPServer();
server.run().catch(console.error);
