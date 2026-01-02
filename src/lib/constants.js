/**
 * Constants and configuration for the MCP server.
 * All paths and mappings are defined here for easy configuration.
 */

import { join } from 'path';

// Source directories
export const PROJECT_ROOT = process.cwd();
export const DOCS_DIR = process.env.DOCS_DIR || join(PROJECT_ROOT, 'docs');
export const PROJECT_DIR = join(PROJECT_ROOT, '.project');
export const TODOS_DIR = join(PROJECT_DIR, 'todos');
export const ARCHIVE_DIR = join(PROJECT_DIR, 'archive');
export const BACKLOG_FILE = join(PROJECT_DIR, 'BACKLOG.md');
export const THOUGHTS_DIR = join(PROJECT_DIR, 'thoughts');
export const THOUGHTS_TODOS_DIR = join(THOUGHTS_DIR, 'todos');
export const THOUGHTS_ARCHIVE_DIR = join(THOUGHTS_TODOS_DIR, '.archive');

/**
 * Intent to source mapping.
 * Maps user intent to which directories should be searched.
 *
 * IMPORTANT DISTINCTION:
 * - "project" (operational) → .project/ management files (status, todos, roadmap, backlog)
 * - "project_docs" (documentation) → docs/ folder + DECISIONS.md (application documentation)
 *
 * When users say "project docs" or "project documentation", they mean APPLICATION
 * documentation (how the system works), NOT project management (tracking work).
 */
export const INTENT_SOURCES = {
	project: ['project', 'root', 'docs'], // .project/, root files, docs/
	docs: ['docs'], // Only docs/
	project_docs: ['docs', 'decisions'], // Application documentation: docs/ + DECISIONS.md
	plan: ['project'], // Only .project/
	todos: ['project'],
	roadmap: ['project'],
	status: ['project'],
	operational: ['project'],
	decisions: ['decisions'], // Architecture decisions only (DECISIONS.md)
};

/**
 * Valid task statuses
 */
export const VALID_STATUSES = ['todo', 'in_progress', 'blocked', 'review', 'done'];

/**
 * Valid priority levels
 */
export const VALID_PRIORITIES = ['P0', 'P1', 'P2', 'P3'];

/**
 * Priority order for sorting (lower = higher priority)
 */
export const PRIORITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 };

/**
 * Status order for sorting
 */
export const STATUS_ORDER = { in_progress: 0, todo: 1, blocked: 2, review: 3, done: 4 };

/**
 * Section mappings for TODO.md
 */
export const TODO_SECTIONS = {
	in_progress: 'In Progress',
	next_up: 'Next Up',
	blocked: 'Blocked',
	completed: 'Completed',
};

/**
 * Status emoji mappings
 */
export const STATUS_EMOJI = {
	in_progress: '🔵',
	todo: '⚪',
	blocked: '🔴',
	review: '🟡',
	done: '✅',
};

/**
 * Priority keywords for auto-detection
 */
export const PRIORITY_KEYWORDS = {
	critical: 'P0',
	blocker: 'P0',
	urgent: 'P0',
	high: 'P1',
	important: 'P1',
	medium: 'P2',
	normal: 'P2',
	low: 'P3',
	minor: 'P3',
	'nice-to-have': 'P3',
};
