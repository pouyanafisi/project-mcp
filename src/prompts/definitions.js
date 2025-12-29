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
	project_overview: ['check_project_state', 'search_project', 'list_tasks'],
	get_next_task: ['get_next_task'],
	init_project: ['init_project'],
	import_tasks: ['import_tasks'],
	promote_task: ['promote_task', 'update_task'],
	lint_project: ['lint_project_docs'],
	list_tasks: ['list_tasks'],
	update_task: ['update_task'],
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
];

/**
 * Get all prompt names
 * @returns {string[]}
 */
export function getPromptNames() {
	return prompts.map((p) => p.name);
}

/**
 * Get tools used by a prompt
 * @param {string} promptName
 * @returns {string[]}
 */
export function getToolsForPrompt(promptName) {
	return promptToolMapping[promptName] || [];
}
