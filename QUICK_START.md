# Quick Start Guide

Get up and running with `project-mcp` in 5 minutes.

## Step 1: Install

```bash
npm install project-mcp
```

## Step 2: Configure MCP

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

## Step 3: Create Project Structure

### Create `.project/` Directory

```bash
mkdir .project
```

### Create `.project/index.md` (Contract File)

```markdown
# Project Knowledge Index

## Contract for AI Agents

When a user says **"project"**, **"the project"**, or **"my project"**, the
canonical sources of truth are, in order:

1. **`.project/`** — Current state, plans, todos, decisions, operational truth
2. **Root markdown files** — README.md, DEVELOPMENT.md, ARCHITECTURE.md, etc.
3. **`docs/`** — Long-form reference documentation

## Source Mappings

### "project" / "the project" / "my project"

Searches (in order):

- `.project/` directory
- Root-level markdown files (README.md, DEVELOPMENT.md, ARCHITECTURE.md, etc.)
- `docs/` directory

### "docs" / "documentation" / "reference"

Searches only:

- `docs/` directory

### "plan" / "todos" / "roadmap" / "status" / "operational"

Searches only:

- `.project/` directory
```

### Create `.project/TODO.md`

```markdown
# TODO

## In Progress

- [ ] Set up project-mcp
- [ ] Create documentation structure

## Next Up

- [ ] Add more documentation

## Completed

- [x] Installed project-mcp
```

### Create `docs/` Directory (Optional)

```bash
mkdir -p docs/architecture docs/api docs/guides
```

## Step 4: Restart Your MCP Client

Restart Cursor, Claude Desktop, or your MCP client to load the server.

## Step 5: Test It

Ask your AI agent:

- "What's the project status?" → Searches `.project/`
- "Show me the API docs" → Searches `docs/`
- "Tell me about the project" → Searches all sources

## That's It!

Your project documentation is now searchable by AI agents with intent-based
search.

## Next Steps

- Read the [full README](README.md) for detailed documentation
- Check out [documentation templates](.github/README_TEMPLATES.md) for examples
- See [EXAMPLES.md](EXAMPLES.md) for usage patterns
