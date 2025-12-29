/**
 * Main MCP Server class.
 * Coordinates all capabilities: tools, prompts, and resources.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { definitions as toolDefinitions, getHandler } from './tools/index.js';
import { setupPrompts } from './prompts/index.js';
import { setupResources } from './resources/index.js';

/**
 * Project MCP Server
 * Provides intent-based search across project documentation sources.
 */
export class ProjectMCPServer {
	constructor() {
		this.server = new Server(
			{
				name: 'project-mcp',
				version: '1.4.0',
			},
			{
				capabilities: {
					tools: {},
					resources: {},
					prompts: {},
				},
			}
		);

		this.setupHandlers();
	}

	/**
	 * Setup all handlers: prompts, tools, resources
	 */
	setupHandlers() {
		// Setup prompts capability
		setupPrompts(this.server);

		// Setup resources capability
		setupResources(this.server);

		// Setup tools capability
		this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
			tools: toolDefinitions,
		}));

		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			const { name, arguments: args } = request.params;

			try {
				const handler = getHandler(name);
				if (!handler) {
					throw new Error(`Unknown tool: ${name}`);
				}
				return await handler(args);
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
	}

	/**
	 * Run the server
	 */
	async run() {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		console.error(`Project MCP server running on stdio`);
		console.error(`Sources: .project/ (operational), root files, docs/ (reference)`);
	}
}
