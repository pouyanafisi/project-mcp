/**
 * File system utilities for the MCP server.
 */

import { readFile, readdir, stat, writeFile, mkdir, unlink, rename } from 'fs/promises';
import { join, extname, basename } from 'path';
import matter from 'gray-matter';
import { PROJECT_DIR, TODOS_DIR, ARCHIVE_DIR } from './constants.js';

/**
 * Ensure .project directory exists
 */
export async function ensureProjectDir() {
	try {
		await mkdir(PROJECT_DIR, { recursive: true });
	} catch (error) {
		// Directory might already exist
	}
}

/**
 * Ensure .project/todos directory exists
 */
export async function ensureTodosDir() {
	try {
		await mkdir(TODOS_DIR, { recursive: true });
	} catch (error) {
		// Directory might already exist
	}
}

/**
 * Ensure .project/archive directory exists
 */
export async function ensureArchiveDir() {
	try {
		await mkdir(ARCHIVE_DIR, { recursive: true });
	} catch (error) {
		// Directory might already exist
	}
}

/**
 * Check if a file exists
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>}
 */
export async function fileExists(filePath) {
	try {
		await stat(filePath);
		return true;
	} catch {
		return false;
	}
}

/**
 * Read and parse a markdown file with frontmatter
 * @param {string} filePath - Path to the file
 * @returns {Promise<{data: object, content: string}>}
 */
export async function readMarkdownFile(filePath) {
	const content = await readFile(filePath, 'utf-8');
	return matter(content);
}

/**
 * Write a file with frontmatter
 * @param {string} filePath - Path to write
 * @param {string} content - Markdown content
 * @param {object} frontmatter - Frontmatter data
 */
export async function writeMarkdownFile(filePath, content, frontmatter) {
	const fileContent = matter.stringify(content, frontmatter);
	await writeFile(filePath, fileContent, 'utf-8');
}

/**
 * Extract title from markdown content
 * @param {string} content - Markdown content
 * @returns {string|null}
 */
export function extractTitle(content) {
	const match = content.match(/^#\s+(.+)$/m);
	return match ? match[1].trim() : null;
}

/**
 * Extract description from markdown content
 * @param {string} content - Markdown content
 * @returns {string|null}
 */
export function extractDescription(content) {
	const lines = content.split('\n').filter((line) => line.trim());
	for (let i = 1; i < Math.min(5, lines.length); i++) {
		const line = lines[i].trim();
		if (line && !line.startsWith('#') && line.length > 20) {
			return line.substring(0, 200);
		}
	}
	return null;
}

/**
 * Scan a directory recursively for markdown files
 * @param {string} dir - Directory to scan
 * @param {string} relativePath - Relative path prefix
 * @param {Array} files - Array to push files to
 * @param {string} source - Source identifier
 */
export async function scanDirectory(dir, relativePath, files, source) {
	try {
		const entries = await readdir(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(dir, entry.name);
			const relPath = relativePath ? join(relativePath, entry.name) : entry.name;

			if (entry.isDirectory()) {
				await scanDirectory(fullPath, relPath, files, source);
			} else if (entry.isFile() && extname(entry.name) === '.md') {
				try {
					const content = await readFile(fullPath, 'utf-8');
					const parsed = matter(content);
					const category = getCategory(relPath, source);

					files.push({
						path: relPath,
						fullPath,
						source,
						title: parsed.data.title || extractTitle(content) || entry.name,
						description: parsed.data.description || extractDescription(content),
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
		// Directory might not exist
	}
}

/**
 * Get category from file path and source
 * @param {string} path - File path
 * @param {string} source - Source identifier
 * @returns {string}
 */
export function getCategory(path, source) {
	if (source === 'root') return 'root';
	if (source === 'project') return 'project';
	const parts = path.split('/');
	if (parts.length > 1 && parts[0] !== 'docs') return parts[0];
	if (parts.length > 2) return parts[1];
	return source;
}

// Re-export fs functions for convenience
export { readFile, readdir, stat, writeFile, mkdir, unlink, rename };
export { join, extname, basename };
export { matter };
