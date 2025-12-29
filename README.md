# Project MCP Server

A generic MCP (Model Context Protocol) server that provides intent-based search across project documentation. Maps natural language to appropriate sources: `.project/` (operational truth), root-level files, and `docs/` (reference truth).

## Features

- **Intent-Based Search**: Maps natural language to appropriate sources automatically
  - "project" → searches `.project/`, root files, and `docs/`
  - "docs" → searches only `docs/`
  - "plan/todos/roadmap/status" → searches only `.project/`
- **Multi-Source Support**: Searches across `.project/`, root-level files, and `docs/` directories
- **Semantic Search**: Fuzzy matching with relevance scoring using Fuse.js
- **Category Filtering**: Filter searches by documentation category
- **Full Document Access**: Retrieve complete documentation files
- **Resource Access**: Access files as MCP resources via `project://` URIs

## Installation

### As NPM Package (Recommended)

```bash
npm install project-mcp
```

### From Source

```bash
git clone https://github.com/yourusername/project-mcp.git
cd project-mcp
npm install
```

## Quick Start

Add to your `.mcp.json`:

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

## Configuration

### Basic Setup

The server automatically searches:
- `.project/` directory (operational truth: plans, todos, status)
- Root-level markdown files (README.md, DEVELOPMENT.md, etc.)
- `docs/` directory (reference documentation)

### Custom Documentation Directory

Set the `DOCS_DIR` environment variable to use a different docs directory:

```json
{
	"mcpServers": {
		"project": {
			"command": "npx",
			"args": ["-y", "project-mcp"],
			"env": {
				"DOCS_DIR": "/path/to/your/docs"
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
			"cwd": "/path/to/project/root"
		}
	}
}
```

## Tools

### `search_project`

Search across all project sources with automatic intent detection. Use this when the user says "project", "the project", or asks about project status, plans, todos, or roadmap.

**Parameters:**
- `query` (required): Search query
- `intent` (optional): Explicit intent ("project", "docs", "plan", "todos", "roadmap", "status", "operational")
- `maxResults` (optional): Maximum results (default: 10, max: 50)

**Intent Mapping:**
- `project` → searches `.project/`, root files, and `docs/`
- `docs` → searches only `docs/`
- `plan/todos/roadmap/status/operational` → searches only `.project/`

**Example:**
```json
{
	"query": "What is the current project status?",
	"maxResults": 5
}
```

### `search_docs`

Search only the `docs/` directory for reference documentation.

**Parameters:**
- `query` (required): Search query
- `category` (optional): Filter by category
- `maxResults` (optional): Maximum results (default: 10, max: 50)

**Example:**
```json
{
	"query": "API authentication",
	"category": "api",
	"maxResults": 5
}
```

### `get_doc`

Get the full content of a specific file from any source.

**Parameters:**
- `path` (required): File path (e.g., ".project/index.md", "README.md", "docs/architecture/ARCHITECTURE.md")

**Example:**
```json
{
	"path": ".project/index.md"
}
```

### `list_docs`

List all available documentation files organized by category.

**Parameters:**
- `category` (optional): Filter by category

### `get_doc_structure`

Get the complete documentation directory structure.

## How It Works

### Intent-Based Source Mapping

The server maps natural language to appropriate sources:

| User Says | Searches |
|-----------|----------|
| "project" / "the project" | `.project/` + root files + `docs/` |
| "docs" / "documentation" | Only `docs/` |
| "plan" / "todos" / "roadmap" / "status" | Only `.project/` |

### Directory Structure

The server expects this structure:

```
/
├── .project/          # Operational truth (plans, todos, status, decisions)
│   ├── index.md       # Contract file (defines source mappings)
│   ├── TODO.md        # Current todos
│   ├── ROADMAP.md     # Project roadmap
│   └── STATUS.md      # Current project status
│
├── docs/              # Reference truth (long-form documentation)
│   ├── architecture/  # Technical architecture
│   ├── api/           # API documentation
│   ├── guides/        # How-to guides
│   └── ...
│
├── README.md          # Project overview
├── DEVELOPMENT.md     # Development guidelines
└── ARCHITECTURE.md    # High-level architecture
```

### Automatic Indexing

The server automatically:

1. Scans `.project/`, root-level, and `docs/` directories
2. Indexes all Markdown (`.md`) files
3. Extracts metadata:
   - **Titles**: From frontmatter `title` field or first H1 heading
   - **Descriptions**: From frontmatter `description` field or first paragraph
   - **Categories**: Based on subdirectory structure
   - **Source**: Which directory the file came from
4. Builds a search index using Fuse.js for fuzzy matching
5. Provides intent-based search across all sources

## Frontmatter Support

The server supports YAML frontmatter in Markdown files:

```markdown
---
title: My Documentation
description: This is a description of the documentation
---

# My Documentation

Content here...
```

If frontmatter is not present, the server extracts the title from the first H1 heading and description from the first paragraph.

## Environment Variables

- `DOCS_DIR`: Path to documentation directory (default: `docs/` in current working directory)

## Development

### Prerequisites

- Node.js 18+ 
- npm

### Setup

```bash
# Clone repository
git clone https://github.com/yourusername/project-mcp.git
cd project-mcp

# Install dependencies
npm install

# Run tests
npm test

# Test the server
node index.js
```

### Dependencies

- `@modelcontextprotocol/sdk`: MCP SDK for Node.js
- `fuse.js`: Fuzzy search and relevance scoring
- `gray-matter`: Markdown frontmatter parsing
- `mime-types`: MIME type detection

### Scripts

- `npm start` - Start the MCP server
- `npm test` - Run tests
- `npm run lint` - Check code syntax
- `npm run prepublishOnly` - Run pre-publish checks

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

See [SECURITY.md](SECURITY.md) for security policy and reporting vulnerabilities.

## License

MIT - see [LICENSE](LICENSE) for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/project-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/project-mcp/discussions)
