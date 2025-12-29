/**
 * Search tools for the MCP server.
 * Handles: search_project, search_docs, get_doc, list_docs, get_doc_structure
 */

import Fuse from 'fuse.js';
import { basename } from 'path';
import { PROJECT_ROOT, DOCS_DIR, PROJECT_DIR } from '../lib/constants.js';
import { readFile, fileExists, join, matter } from '../lib/files.js';
import {
	loadAllFiles,
	getCachedFiles,
	detectIntent,
	getSourcesForIntent,
	extractSnippet,
} from '../lib/search.js';

/**
 * Tool definitions
 */
export const definitions = [
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
];

/**
 * Search project handler
 */
async function searchProject(args) {
	const { query, intent: explicitIntent, maxResults = 10 } = args;

	await loadAllFiles();
	const allFilesCache = getCachedFiles();

	// Detect intent from query
	const intent = detectIntent(query, explicitIntent);
	const sources = getSourcesForIntent(intent);

	// Filter files by source
	let filesToSearch = allFilesCache.filter((file) => sources.includes(file.source));

	// Rebuild index with filtered files
	const index = new Fuse(filesToSearch, {
		keys: ['title', 'content', 'path', 'category', 'source'],
		threshold: 0.4,
		includeScore: true,
		includeMatches: true,
	});

	const results = index.search(query).slice(0, maxResults);

	const formattedResults = results.map((result) => {
		const doc = result.item;
		const score = result.score || 0;
		const matches = result.matches || [];

		const snippet = extractSnippet(doc.content, query, matches);

		return {
			path: doc.path,
			title: doc.title,
			description: doc.description,
			source: doc.source,
			category: doc.category,
			relevanceScore: (1 - score).toFixed(3),
			snippet,
			matchedFields: matches.map((m) => m.key).filter((v, i, a) => a.indexOf(v) === i),
		};
	});

	const resultText = formattedResults
		.map((result) => {
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
		intent !== 'project'
			? `\n*Intent detected: "${intent}" - searched ${sources.join(', ')} sources*\n`
			: '';

	return {
		content: [
			{
				type: 'text',
				text: intentInfo + (resultText || `No results found for query: "${query}"`),
			},
		],
	};
}

/**
 * Search docs handler
 */
async function searchDocs(args) {
	const { query, category, maxResults = 10 } = args;

	await loadAllFiles();
	const allFilesCache = getCachedFiles();

	let docsToSearch = allFilesCache.filter((file) => file.source === 'docs');
	if (category) {
		docsToSearch = docsToSearch.filter((doc) => doc.category === category);
	}

	const index = new Fuse(docsToSearch, {
		keys: ['title', 'content', 'path', 'category'],
		threshold: 0.4,
		includeScore: true,
		includeMatches: true,
	});

	const results = index.search(query).slice(0, maxResults);

	const formattedResults = results.map((result) => {
		const doc = result.item;
		const score = result.score || 0;
		const matches = result.matches || [];

		const snippet = extractSnippet(doc.content, query, matches);

		return {
			path: doc.path,
			title: doc.title,
			description: doc.description,
			category: doc.category,
			relevanceScore: (1 - score).toFixed(3),
			snippet,
			matchedFields: matches.map((m) => m.key).filter((v, i, a) => a.indexOf(v) === i),
		};
	});

	const resultText = formattedResults
		.map((result) => {
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

/**
 * Get doc handler
 */
async function getDoc(args) {
	const { path } = args;

	// Try different path resolutions
	const possiblePaths = [
		join(PROJECT_ROOT, path),
		path.startsWith('.project/') ? join(PROJECT_ROOT, path) : null,
		path.startsWith('docs/') ? join(PROJECT_ROOT, path) : null,
		join(DOCS_DIR, path),
		join(PROJECT_DIR, path),
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

/**
 * List docs handler
 */
async function listDocs(args) {
	const { category } = args || {};
	await loadAllFiles();
	const allFilesCache = getCachedFiles();

	let docs = allFilesCache.filter((file) => file.source === 'docs');
	if (category) {
		docs = docs.filter((doc) => doc.category === category);
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
					(file) =>
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

/**
 * Get doc structure handler
 */
async function getDocStructure() {
	await loadAllFiles();
	const allFilesCache = getCachedFiles();

	const structure = {};
	allFilesCache.forEach((doc) => {
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
		current._files = current._files || [];
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
				value.forEach((file) => {
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

/**
 * Handler map
 */
export const handlers = {
	search_project: searchProject,
	search_docs: searchDocs,
	get_doc: getDoc,
	list_docs: listDocs,
	get_doc_structure: getDocStructure,
};
