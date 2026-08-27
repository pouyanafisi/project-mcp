/**
 * Tool registry - combines all tools from all modules.
 */

import * as search from './search.js';
import * as projectFiles from './project-files.js';
import * as tasks from './tasks.js';
import * as backlog from './backlog.js';
import * as lint from './lint.js';
import * as thoughts from './thoughts.js';
import * as docs from './docs.js';

/**
 * All tool modules
 *
 * IMPORTANT for NLP/LLM selection:
 * - projectFiles: Manages .project/ directory (operational status, todos, roadmap, backlog)
 * - docs: Manages docs/ directory (application documentation, architecture, release notes)
 */
const modules = [search, projectFiles, tasks, backlog, lint, thoughts, docs];

/**
 * Combined tool definitions
 */
export const definitions = modules.flatMap(m => m.definitions);

/**
 * Combined handler map
 */
export const handlers = modules.reduce((acc, m) => ({ ...acc, ...m.handlers }), {});

/**
 * Get handler for a tool name
 * @param {string} name - Tool name
 * @returns {Function|undefined} Handler function
 */
export function getHandler(name) {
	return handlers[name];
}

/**
 * Check if a tool exists
 * @param {string} name - Tool name
 * @returns {boolean}
 */
export function hasHandler(name) {
	return name in handlers;
}
