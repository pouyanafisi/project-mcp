/**
 * Task management utilities.
 */

import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import matter from 'gray-matter';
import {
	TODOS_DIR,
	ARCHIVE_DIR,
	BACKLOG_FILE,
	PRIORITY_ORDER,
	PRIORITY_KEYWORDS,
} from './constants.js';
import { ensureTodosDir, fileExists } from './files.js';

/**
 * Generate next task ID for a project
 * @param {string} project - Project prefix
 * @returns {Promise<string>} Next task ID (e.g., "AUTH-001")
 */
export async function getNextTaskId(project) {
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
 * @returns {Promise<Array>} Array of task objects
 */
export async function loadAllTasks() {
	await ensureTodosDir();
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
 * @param {object} task - Task to check
 * @param {Array} allTasks - All tasks for reference
 * @returns {boolean}
 */
export function areDependenciesMet(task, allTasks) {
	if (!task.depends_on || task.depends_on.length === 0) return true;
	const taskMap = new Map(allTasks.map((t) => [t.id, t]));
	for (const depId of task.depends_on) {
		const dep = taskMap.get(depId);
		if (!dep || dep.status !== 'done') return false;
	}
	return true;
}

/**
 * Sort tasks by priority, then by ID
 * @param {Array} tasks - Tasks to sort
 * @returns {Array} Sorted tasks
 */
export function sortTasksByPriority(tasks) {
	return [...tasks].sort((a, b) => {
		// In-progress tasks first
		if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
		if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;
		// Then by priority
		const aPri = PRIORITY_ORDER[a.priority] ?? 2;
		const bPri = PRIORITY_ORDER[b.priority] ?? 2;
		if (aPri !== bPri) return aPri - bPri;
		// Then by due date
		if (a.due && b.due) return a.due.localeCompare(b.due);
		if (a.due) return -1;
		if (b.due) return 1;
		// Then by ID
		return a.id.localeCompare(b.id);
	});
}

/**
 * Get all existing task IDs from backlog and todos
 * @param {string} projectPrefix - Project prefix to filter
 * @returns {Promise<Set<string>>} Set of existing IDs
 */
export async function getExistingTaskIds(projectPrefix) {
	const existingIds = new Set();

	// Check todos/ directory
	try {
		const files = await readdir(TODOS_DIR);
		for (const file of files) {
			const match = file.match(/^([A-Z]+-\d+)\.md$/);
			if (match) existingIds.add(match[1]);
		}
	} catch {
		// Directory might not exist
	}

	// Check archive/ directory
	try {
		const files = await readdir(ARCHIVE_DIR);
		for (const file of files) {
			const match = file.match(/^([A-Z]+-\d+)\.md$/);
			if (match) existingIds.add(match[1]);
		}
	} catch {
		// Directory might not exist
	}

	// Check BACKLOG.md
	try {
		if (await fileExists(BACKLOG_FILE)) {
			const backlog = await readFile(BACKLOG_FILE, 'utf-8');
			const idMatches = backlog.matchAll(/\*\*([A-Z]+-\d+)\*\*/g);
			for (const match of idMatches) {
				existingIds.add(match[1]);
			}
		}
	} catch {
		// File might not exist
	}

	return existingIds;
}

/**
 * Parse tasks from markdown content
 * @param {string} content - Markdown content
 * @param {string} project - Project prefix
 * @param {string} defaultPriority - Default priority level
 * @returns {Array} Parsed tasks
 */
export function parseTasksFromContent(content, project, defaultPriority) {
	const tasks = [];
	const lines = content.split('\n');

	let currentPhase = null;
	let currentSection = null;
	let currentParent = null;

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
			for (const [keyword, pri] of Object.entries(PRIORITY_KEYWORDS)) {
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
				const parent = tasks.find((t) => t.tempId === currentParent);
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
					task.tags = tagMatch.map((t) => t.slice(1, -1).toLowerCase());
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
 * @param {string} priority - Priority to normalize
 * @returns {string} Normalized priority
 */
export function normalizePriority(priority) {
	if (!priority) return 'P2';
	const upper = String(priority).toUpperCase();
	if (upper === 'CRITICAL' || upper === 'HIGHEST' || upper === 'P0') return 'P0';
	if (upper === 'HIGH' || upper === 'P1') return 'P1';
	if (upper === 'MEDIUM' || upper === 'NORMAL' || upper === 'P2') return 'P2';
	if (upper === 'LOW' || upper === 'LOWEST' || upper === 'P3') return 'P3';
	if (/^P[0-3]$/.test(upper)) return upper;
	return 'P2';
}
