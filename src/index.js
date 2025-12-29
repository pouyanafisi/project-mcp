#!/usr/bin/env node

/**
 * Entry point for the Project MCP Server.
 *
 * This MCP server provides tools for managing project documentation,
 * task management with YAML frontmatter, and semantic search across
 * multiple documentation sources.
 */

import { ProjectMCPServer } from './server.js';

const server = new ProjectMCPServer();
server.run().catch(console.error);
