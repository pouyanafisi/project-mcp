# Getting Started

> Install and configure project-mcp in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- An MCP-compatible client (Cursor, Claude Desktop, etc.)

## Installation

### Option 1: NPX (Recommended)

No installation needed. Configure your MCP client to run via npx:

```json
{
	"mcpServers": {
		"project": {
			"command": "npx",
			"args": ["-y", "project-mcp"]
		}
	}
}
```

### Option 2: Global Install

```bash
npm install -g project-mcp
```

Then configure:

```json
{
	"mcpServers": {
		"project": {
			"command": "project-mcp"
		}
	}
}
```

### Option 3: Local Install

```bash
npm install project-mcp
```

Configure with path to local installation:

```json
{
	"mcpServers": {
		"project": {
			"command": "node",
			"args": ["./node_modules/project-mcp/src/index.js"]
		}
	}
}
```

---

## Configuration

### Cursor IDE

1. Create or edit `.mcp.json` in your project root:

```json
{
	"mcpServers": {
		"project": {
			"command": "npx",
			"args": ["-y", "project-mcp"]
		}
	}
}
```

2. Restart Cursor to load the MCP server.

### Claude Desktop

1. Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
	"mcpServers": {
		"project": {
			"command": "npx",
			"args": ["-y", "project-mcp"]
		}
	}
}
```

2. Restart Claude Desktop.

---

## Verify Installation

Ask your AI assistant:

> "Use the check_project_state tool to see what project files exist."

You should see a response listing which project management files exist.

---

## Initialize Your Project

Set up the `.project/` directory structure:

```json
{
	"tool": "init_project",
	"arguments": {
		"project_name": "My Project",
		"project_description": "A description of my project"
	}
}
```

This creates:

- `.project/index.md` — Contract file
- `.project/TODO.md` — Task dashboard
- `.project/ROADMAP.md` — Project roadmap
- `.project/STATUS.md` — Project status
- `.project/DECISIONS.md` — Architecture decisions
- `.project/todos/` — Active task directory

---

## First Commands

### Search Your Project

```json
{
	"tool": "search_project",
	"arguments": {
		"query": "getting started"
	}
}
```

### Update Project Status

```json
{
	"tool": "update_project_status",
	"arguments": {
		"status": "Project initialized and ready for development",
		"health": "green"
	}
}
```

### Create Your First Task

```json
{
	"tool": "create_task",
	"arguments": {
		"title": "Set up development environment",
		"project": "SETUP",
		"priority": "P1"
	}
}
```

---

## Configuration Options

### Custom Documentation Directory

```json
{
	"mcpServers": {
		"project": {
			"command": "npx",
			"args": ["-y", "project-mcp"],
			"env": {
				"DOCS_DIR": "/path/to/custom/docs"
			}
		}
	}
}
```

### Custom Working Directory

```json
{
	"mcpServers": {
		"project": {
			"command": "npx",
			"args": ["-y", "project-mcp"],
			"cwd": "/path/to/project"
		}
	}
}
```

---

## Next Steps

- [**Project Setup**](./PROJECT_SETUP.md) — Detailed project structure guide
- [**Task Management**](./TASK_MANAGEMENT.md) — Learn the full task workflow
- [**Best Practices**](./BEST_PRACTICES.md) — Tips for effective usage

---

## Troubleshooting

### Server Not Starting

1. Verify Node.js version: `node --version` (need 18+)
2. Check MCP config path and syntax
3. Restart your MCP client

### Tools Not Available

1. Verify the server is running (check client logs)
2. Check for typos in tool names
3. Ensure the server has access to your project directory

### Permission Issues

If you see permission errors:

1. Ensure the project directory is writable
2. Check file permissions on `.project/`

---

_See [API Reference](../api/) for complete tool documentation._
