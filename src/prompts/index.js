/**
 * Prompt handlers for the MCP server.
 */

import {
	ListPromptsRequestSchema,
	GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { prompts, promptToolMapping } from './definitions.js';

/**
 * Generate messages for a prompt that guide the agent to use the right tools
 * @param {string} promptName - Name of the prompt
 * @param {object} args - Prompt arguments
 * @returns {Array} Messages array
 */
function generatePromptMessages(promptName, args) {
	const messages = {
		project_overview: [
			{
				role: 'user',
				content: {
					type: 'text',
					text: `Please give me an overview of this project. Use the following tools:
1. First, use \`check_project_state\` to see what project files exist
2. Then use \`search_project\` with query "project status overview" to find relevant information
3. Use \`list_tasks\` to show current work status
4. Summarize the findings in a clear overview`,
				},
			},
		],
		get_next_task: [
			{
				role: 'user',
				content: {
					type: 'text',
					text: `Find the next task I should work on.${args.owner ? ` Filter by owner: ${args.owner}` : ''}

Use the \`get_next_task\` tool${args.owner ? ` with owner: "${args.owner}"` : ''} to find tasks that:
- Have all dependencies completed
- Are not blocked
- Are highest priority

Then explain what the task involves and any context from the project.`,
				},
			},
		],
		init_project: [
			{
				role: 'user',
				content: {
					type: 'text',
					text: `Initialize a new project called "${args.project_name || 'My Project'}"${args.description ? ` with description: "${args.description}"` : ''}.

Use the \`init_project\` tool with:
- project_name: "${args.project_name || 'My Project'}"
${args.description ? `- project_description: "${args.description}"` : ''}

This will create the standard .project/ structure with:
- index.md (contract file)
- BACKLOG.md (task queue)
- TODO.md (dashboard)
- ROADMAP.md, STATUS.md, DECISIONS.md
- todos/ and archive/ directories`,
				},
			},
		],
		import_tasks: [
			{
				role: 'user',
				content: {
					type: 'text',
					text: `Import tasks from "${args.source_file || 'ROADMAP.md'}" into the backlog.

Use the \`import_tasks\` tool with:
- source: "${args.source_file || '.project/ROADMAP.md'}"
- project: "${args.project_prefix || 'PROJ'}"
- dry_run: true (first to preview)

Then run again with dry_run: false to actually import.
Tasks will be added to BACKLOG.md, not as individual files.`,
				},
			},
		],
		promote_task: [
			{
				role: 'user',
				content: {
					type: 'text',
					text: `Start working on task ${args.task_id || '[TASK_ID]'}.

Use the \`promote_task\` tool with:
- task_id: "${args.task_id || '[TASK_ID]'}"

This moves the task from BACKLOG.md to an active YAML file in todos/.
Then use \`update_task\` to set status to "in_progress".`,
				},
			},
		],
		lint_project: [
			{
				role: 'user',
				content: {
					type: 'text',
					text: `Check the health of project documentation.

Use the \`lint_project_docs\` tool with:
- fix: ${args.fix_issues === 'true' || args.fix_issues === true}
- scope: "all"

This validates:
- Required files exist
- Task frontmatter is valid
- Dependencies aren't broken
- No circular dependencies
- Timestamps are present`,
				},
			},
		],
		list_tasks: [
			{
				role: 'user',
				content: {
					type: 'text',
					text: `List all tasks${args.status_filter ? ` filtered by status: ${args.status_filter}` : ''}.

Use the \`list_tasks\` tool${args.status_filter ? ` with status: "${args.status_filter}"` : ''}.

This shows tasks organized by status with counts and a summary dashboard.`,
				},
			},
		],
		update_task: [
			{
				role: 'user',
				content: {
					type: 'text',
					text: `Update task ${args.task_id || '[TASK_ID]'} to status: ${args.new_status || '[STATUS]'}.

Use the \`update_task\` tool with:
- id: "${args.task_id || '[TASK_ID]'}"
- status: "${args.new_status || '[STATUS]'}"

Valid statuses: todo, in_progress, blocked, review, done`,
				},
			},
		],
	};

	return (
		messages[promptName] || [
			{
				role: 'user',
				content: {
					type: 'text',
					text: `Use the appropriate project-mcp tool for this request.`,
				},
			},
		]
	);
}

/**
 * Get all message handler keys (for testing)
 * @returns {string[]}
 */
export function getMessageHandlerKeys() {
	const messages = {
		project_overview: true,
		get_next_task: true,
		init_project: true,
		import_tasks: true,
		promote_task: true,
		lint_project: true,
		list_tasks: true,
		update_task: true,
	};
	return Object.keys(messages);
}

/**
 * Setup prompt handlers on the server
 * @param {Server} server - MCP server instance
 */
export function setupPrompts(server) {
	// Handle list prompts request
	server.setRequestHandler(ListPromptsRequestSchema, async () => ({
		prompts,
	}));

	// Handle get prompt request
	server.setRequestHandler(GetPromptRequestSchema, async (request) => {
		const { name, arguments: args } = request.params;
		const prompt = prompts.find((p) => p.name === name);

		if (!prompt) {
			throw new Error(`Prompt not found: ${name}`);
		}

		// Generate the appropriate tool call guidance based on the prompt
		const messages = generatePromptMessages(name, args || {});

		return {
			description: prompt.description,
			messages,
		};
	});
}

export { prompts, promptToolMapping };
