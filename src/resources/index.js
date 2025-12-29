/**
 * Resource handlers for the MCP server.
 */

import {
	ListResourcesRequestSchema,
	ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { lookup } from 'mime-types';
import { PROJECT_ROOT } from '../lib/constants.js';
import { readFile, join } from '../lib/files.js';
import { loadAllFiles, getCachedFiles } from '../lib/search.js';

/**
 * List all available resources
 * @returns {Promise<Array>} Array of resource objects
 */
async function listResources() {
	await loadAllFiles();
	const allFilesCache = getCachedFiles();

	return allFilesCache.map((doc) => ({
		uri: `project://${doc.path}`,
		name: doc.title,
		description: doc.description || `File: ${doc.path} [${doc.source}]`,
		mimeType: 'text/markdown',
	}));
}

/**
 * Read a resource by URI
 * @param {string} uri - Resource URI
 * @returns {Promise<object>} Resource contents
 */
async function readResource(uri) {
	const filePath = uri.replace('project://', '');
	const fullPath = join(PROJECT_ROOT, filePath);

	try {
		const content = await readFile(fullPath, 'utf-8');
		const mimeType = lookup(fullPath) || 'text/plain';

		return {
			contents: [
				{
					uri,
					mimeType,
					text: content,
				},
			],
		};
	} catch (error) {
		throw new Error(`Failed to read resource: ${error.message}`);
	}
}

/**
 * Setup resource handlers on the server
 * @param {Server} server - MCP server instance
 */
export function setupResources(server) {
	server.setRequestHandler(ListResourcesRequestSchema, async () => ({
		resources: await listResources(),
	}));

	server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
		const { uri } = request.params;
		return await readResource(uri);
	});
}
