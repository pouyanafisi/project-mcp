/**
 * Search utilities using Fuse.js for fuzzy matching.
 */

import Fuse from 'fuse.js';
import {
	readFile,
	readdir,
	stat,
	join,
	extname,
	matter,
	scanDirectory,
	extractTitle,
	extractDescription,
} from './files.js';
import { PROJECT_ROOT, DOCS_DIR, PROJECT_DIR, INTENT_SOURCES } from './constants.js';

// Cache for loaded files
let allFilesCache = null;
let allFilesIndex = null;

/**
 * Detect intent from query string or use explicit intent
 * @param {string} query - Search query
 * @param {string} [explicitIntent] - Explicitly provided intent
 * @returns {string} Detected intent
 */
export function detectIntent(query, explicitIntent) {
	if (explicitIntent) return explicitIntent;

	const queryLower = query.toLowerCase();

	// Check for operational keywords
	if (
		/\b(plan|plans|todo|todos|roadmap|status|operational|current state|decisions)\b/.test(queryLower)
	) {
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
 * Get source directories for a given intent
 * @param {string} intent - Intent type
 * @returns {string[]} Array of source names
 */
export function getSourcesForIntent(intent) {
	return INTENT_SOURCES[intent] || INTENT_SOURCES.project;
}

/**
 * Load and index all files from all sources
 * @param {boolean} [force=false] - Force reload even if cached
 * @returns {Promise<Array>} Array of indexed file objects
 */
export async function loadAllFiles(force = false) {
	if (allFilesCache && !force) {
		return allFilesCache;
	}

	const allFiles = [];

	// Load .project/ directory
	try {
		await scanDirectory(PROJECT_DIR, '.project', allFiles, 'project');
	} catch (error) {
		// .project/ might not exist
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
							title: parsed.data.title || extractTitle(content) || file,
							description: parsed.data.description || extractDescription(content),
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
		await scanDirectory(DOCS_DIR, 'docs', allFiles, 'docs');
	} catch (error) {
		// docs/ might not exist
	}

	allFilesCache = allFiles;

	// Build search index
	allFilesIndex = new Fuse(allFiles, {
		keys: ['title', 'content', 'path', 'category', 'source'],
		threshold: 0.4,
		includeScore: true,
		includeMatches: true,
	});

	return allFiles;
}

/**
 * Get the search index
 * @returns {Fuse|null}
 */
export function getSearchIndex() {
	return allFilesIndex;
}

/**
 * Get cached files
 * @returns {Array|null}
 */
export function getCachedFiles() {
	return allFilesCache;
}

/**
 * Clear the file cache
 */
export function clearCache() {
	allFilesCache = null;
	allFilesIndex = null;
}

/**
 * Search files with given parameters
 * @param {string} query - Search query
 * @param {string[]} sources - Sources to search
 * @param {number} maxResults - Maximum results
 * @returns {Promise<Array>} Search results
 */
export async function searchFiles(query, sources, maxResults = 10) {
	await loadAllFiles();

	// Filter files by source
	const filesToSearch = allFilesCache.filter((file) => sources.includes(file.source));

	// Rebuild index with filtered files
	const index = new Fuse(filesToSearch, {
		keys: ['title', 'content', 'path', 'category', 'source'],
		threshold: 0.4,
		includeScore: true,
		includeMatches: true,
	});

	return index.search(query).slice(0, maxResults);
}

/**
 * Extract a relevant snippet from content
 * @param {string} content - Full content
 * @param {string} query - Search query
 * @param {Array} matches - Fuse.js matches
 * @returns {string} Snippet
 */
export function extractSnippet(content, query, matches) {
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
