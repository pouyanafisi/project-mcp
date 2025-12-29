# Usage Examples

## Basic Configuration

### Cursor / Claude Desktop

Add to `.mcp.json` in your project root:

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

### Custom Documentation Directory

```json
{
	"mcpServers": {
		"project": {
			"command": "npx",
			"args": ["-y", "project-mcp"],
			"env": {
				"DOCS_DIR": "/path/to/documentation"
			}
		}
	}
}
```

## Example Queries

### Search Project (All Sources)

When you ask: "What is the current project status?"

The server automatically:
1. Detects intent: "status" → searches only `.project/`
2. Returns relevant files from `.project/STATUS.md`, `.project/TODO.md`, etc.

### Search Documentation Only

When you ask: "Show me the API documentation"

The server:
1. Detects intent: "docs" → searches only `docs/`
2. Returns files from `docs/api/` directory

### Search Everything

When you ask: "Tell me about the project"

The server:
1. Detects intent: "project" → searches `.project/`, root files, and `docs/`
2. Returns results from all sources, prioritized by relevance

## Project Structure Example

```
my-project/
├── .project/
│   ├── index.md       # Contract file
│   ├── TODO.md        # Current todos
│   ├── ROADMAP.md     # Project roadmap
│   └── STATUS.md       # Current status
│
├── docs/
│   ├── architecture/
│   │   └── ARCHITECTURE.md
│   ├── api/
│   │   └── ENDPOINTS.md
│   └── guides/
│       └── SETUP.md
│
├── README.md
└── DEVELOPMENT.md
```

## Intent Examples

| Query | Intent Detected | Sources Searched |
|-------|----------------|------------------|
| "What's the project status?" | `status` | `.project/` only |
| "Show me the todos" | `todos` | `.project/` only |
| "What's the roadmap?" | `roadmap` | `.project/` only |
| "Find API docs" | `docs` | `docs/` only |
| "Tell me about the project" | `project` | All sources |
| "What is this project?" | `project` | All sources |

