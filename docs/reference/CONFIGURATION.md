# Configuration Reference

> Complete configuration options for project-mcp.

## MCP Configuration

### Basic Configuration

Create `.mcp.json` in your project root:

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

### Full Configuration

```json
{
  "mcpServers": {
    "project": {
      "command": "npx",
      "args": ["-y", "project-mcp"],
      "cwd": "/path/to/project/root",
      "env": {
        "DOCS_DIR": "/custom/docs/path",
        "NODE_ENV": "production"
      }
    }
  }
}
```

---

## Configuration Options

### `command`

The command to run the MCP server.

| Value | Usage |
|-------|-------|
| `"npx"` | Run via npx (recommended) |
| `"node"` | Run directly with node |
| `"project-mcp"` | If globally installed |

### `args`

Arguments to pass to the command.

| For npx | For node |
|---------|----------|
| `["-y", "project-mcp"]` | `["./node_modules/project-mcp/src/index.js"]` |

### `cwd`

Working directory for the server.

```json
{
  "cwd": "/path/to/project"
}
```

**Default:** Current directory of the MCP client

**Use case:** When your MCP client is in a different directory than your project.

### `env`

Environment variables to set.

```json
{
  "env": {
    "DOCS_DIR": "/custom/docs",
    "NODE_ENV": "production"
  }
}
```

---

## Environment Variables

### `DOCS_DIR`

Override the documentation directory.

**Default:** `./docs`

**Example:**

```json
{
  "env": {
    "DOCS_DIR": "/path/to/documentation"
  }
}
```

**Use case:** When your docs are in a non-standard location.

---

## Directory Configuration

### Default Directory Structure

project-mcp expects:

```
project/
├── .project/           # Project management
│   ├── index.md
│   ├── TODO.md
│   ├── ROADMAP.md
│   ├── STATUS.md
│   ├── DECISIONS.md
│   ├── BACKLOG.md
│   ├── todos/          # Active tasks
│   └── archive/        # Completed tasks
│
└── docs/               # Reference documentation
    └── ...
```

### Customizing docs/ Location

```json
{
  "env": {
    "DOCS_DIR": "../shared-docs"
  }
}
```

### Note on .project/ Location

The `.project/` directory is always at the project root (where the MCP server runs). To change this, use the `cwd` option.

---

## Client-Specific Configuration

### Cursor IDE

File: `.mcp.json` in project root

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

### Claude Desktop (macOS)

File: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "project": {
      "command": "npx",
      "args": ["-y", "project-mcp"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

### Claude Desktop (Windows)

File: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "project": {
      "command": "npx",
      "args": ["-y", "project-mcp"],
      "cwd": "C:\\path\\to\\your\\project"
    }
  }
}
```

---

## Installation Options

### Option 1: NPX (Recommended)

No installation needed:

```json
{
  "command": "npx",
  "args": ["-y", "project-mcp"]
}
```

### Option 2: Global Install

```bash
npm install -g project-mcp
```

```json
{
  "command": "project-mcp"
}
```

### Option 3: Local Install

```bash
npm install project-mcp
```

```json
{
  "command": "node",
  "args": ["./node_modules/project-mcp/src/index.js"]
}
```

---

## Multiple Projects

### Separate Configurations

Each project has its own `.mcp.json`:

```
project-a/.mcp.json → project-a's docs
project-b/.mcp.json → project-b's docs
```

### Shared Documentation

Point multiple projects to shared docs:

```json
{
  "env": {
    "DOCS_DIR": "/shared/documentation"
  }
}
```

---

## Troubleshooting Configuration

### Server Not Starting

1. Check JSON syntax (use a validator)
2. Verify paths exist
3. Check Node.js version (`node --version` should be 18+)
4. Restart your MCP client

### Wrong Directory

Verify with `check_project_state`:

```json
{
  "tool": "check_project_state",
  "arguments": {}
}
```

If files aren't found, check `cwd` setting.

### Custom Docs Not Found

1. Verify `DOCS_DIR` path is correct
2. Use absolute path if relative isn't working
3. Check directory permissions

---

## Related Documentation

- [Environment Variables](./ENVIRONMENT.md) — All environment options
- [Getting Started](../guides/GETTING_STARTED.md) — Installation guide
- [Project Setup](../guides/PROJECT_SETUP.md) — Directory structure

---

*Last Updated: January 2026*

