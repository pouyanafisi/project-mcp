/**
 * Constants and configuration for the MCP server.
 * All paths and mappings are defined here for easy configuration.
 *
 * KEY DISTINCTION - Two Types of Documentation:
 *
 * 1. PROJECT MANAGEMENT (.project/ directory)
 *    - PURPOSE: Track work progress, project health, operational decisions
 *    - FILES: STATUS.md, TODO.md, ROADMAP.md, BACKLOG.md, DECISIONS.md
 *    - TOOLS: update_project_status, add_decision, create_or_update_*, etc.
 *    - WHEN TO USE: Recording what work is being done, project health, quick decisions
 *
 * 2. APPLICATION DOCUMENTATION (docs/ directory)
 *    - PURPOSE: Permanent reference documentation explaining how the system works
 *    - FILES: Architecture specs, API docs, guides, release notes, etc.
 *    - TOOLS: create_doc, update_doc, add_release_note, update_architecture_doc
 *    - WHEN TO USE: Documenting system design, APIs, user guides, release history
 *
 * The NLP/LLM should choose the appropriate tool based on:
 * - "Update project status" → .project/STATUS.md (operational tracking)
 * - "Document the API" → docs/api/ (permanent reference)
 * - "Record this decision" → .project/DECISIONS.md (operational decision)
 * - "Add architecture documentation" → docs/architecture/ (permanent reference)
 */

import { join } from 'path';

// =============================================================================
// Source Directories
// =============================================================================

export const PROJECT_ROOT = process.cwd();

/**
 * docs/ - Application documentation directory
 * Contains: Reference documentation, API docs, guides, architecture specs, release notes
 * Purpose: Permanent documentation explaining how the system works
 */
export const DOCS_DIR = process.env.DOCS_DIR || join(PROJECT_ROOT, 'docs');

/**
 * .project/ - Project management directory
 * Contains: STATUS.md, TODO.md, ROADMAP.md, BACKLOG.md, DECISIONS.md
 * Purpose: Operational tracking of work progress, health, and decisions
 */
export const PROJECT_DIR = join(PROJECT_ROOT, '.project');

export const TODOS_DIR = join(PROJECT_DIR, 'todos');
export const ARCHIVE_DIR = join(PROJECT_DIR, 'archive');
export const BACKLOG_FILE = join(PROJECT_DIR, 'BACKLOG.md');
export const THOUGHTS_DIR = join(PROJECT_DIR, 'thoughts');
export const THOUGHTS_TODOS_DIR = join(THOUGHTS_DIR, 'todos');
export const THOUGHTS_ARCHIVE_DIR = join(THOUGHTS_TODOS_DIR, '.archive');

// =============================================================================
// Intent to Source Mapping (for search_project tool)
// =============================================================================

/**
 * Maps user intent to which directories should be searched.
 *
 * IMPORTANT DISTINCTION:
 * - "project" → Search everything (management + docs + root)
 * - "docs" → Only docs/ directory (application documentation)
 * - "project_docs" → Application documentation (docs/ + architecture)
 * - "plan/todos/roadmap/status/operational" → Only .project/ (management)
 * - "decisions" → Only .project/DECISIONS.md (operational decisions)
 *
 * When users say "project docs" or "documentation", they typically mean
 * APPLICATION documentation (how the system works), not project management.
 */
export const INTENT_SOURCES = {
	// Search everything
	project: ['project', 'root', 'docs'],

	// Application documentation only
	docs: ['docs'],
	project_docs: ['docs', 'decisions'],
	documentation: ['docs'],
	reference: ['docs'],
	architecture: ['docs'],

	// Project management only
	plan: ['project'],
	todos: ['project'],
	roadmap: ['project'],
	status: ['project'],
	operational: ['project'],
	management: ['project'],

	// Decisions (operational, in .project/)
	decisions: ['decisions'],
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
