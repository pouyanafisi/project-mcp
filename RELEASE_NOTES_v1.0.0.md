# Release v1.0.0 - First Stable Release

**Release Date:** December 29, 2024

## 🎉 First Stable Release

This is the first stable release of `project-mcp`, an intent-based MCP server for project documentation search. This release establishes the standard for AI agent documentation search with zero configuration required.

## ✨ Key Features

### Intent-Based Search

- Maps natural language queries to the right sources automatically
- No configuration needed - understands intent, not just directory names
- Smart detection of user intent from query keywords

### Multi-Source Indexing

- Searches `.project/` directory (operational truth)
- Searches root-level markdown files (README.md, DEVELOPMENT.md, etc.)
- Searches `docs/` directory (reference documentation)

### Zero Configuration

- Automatically discovers and indexes documentation
- Works out of the box with standard project structure
- Customizable via environment variables if needed

## 🛠️ Available Tools

- `search_project` - Intent-based search across all sources
- `search_docs` - Search reference documentation only
- `get_doc` - Get full file content
- `list_docs` - List all documentation files
- `get_doc_structure` - Get directory structure

## 📚 Documentation

- Comprehensive README with examples and architecture diagrams
- Quick Start guide for 5-minute setup
- Documentation templates for all file types
- Best practices and structure guides

## 🎯 Intent Mapping

| User Says                               | Searches                           |
| --------------------------------------- | ---------------------------------- |
| "project" / "the project"               | `.project/` + root files + `docs/` |
| "docs" / "documentation"                | Only `docs/`                       |
| "plan" / "todos" / "roadmap" / "status" | Only `.project/`                   |

## 📦 Installation

```bash
npm install project-mcp
```

## ⚙️ Configuration

Add to `.mcp.json`:

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

## 🔧 Technical Details

- **Node.js:** >=18.0.0
- **Dependencies:**
  - `@modelcontextprotocol/sdk`: ^1.0.4
  - `fuse.js`: ^7.0.0 (fuzzy search)
  - `gray-matter`: ^4.0.3 (frontmatter parsing)
  - `mime-types`: ^2.1.35

## 📝 What's Included

- Core MCP server implementation
- Intent-based search engine
- Fuzzy search with relevance scoring
- Automatic documentation indexing
- Comprehensive documentation
- Quick Start guide
- Documentation templates
- GitHub topics guide

## 🌟 Why This Matters

**Before project-mcp:**

- Agents had to guess which directory to search
- Users had to know directory structure
- Manual mapping required for each project
- No standard for organizing project knowledge

**With project-mcp:**

- Natural language just works
- Intent maps to sources automatically
- Standard contract across all projects
- Zero configuration needed
- Clear separation: operational vs. reference truth

## 🚀 Getting Started

1. Install: `npm install project-mcp`
2. Configure: Add to `.mcp.json` (see above)
3. Create `.project/index.md` contract file
4. Organize your documentation
5. Restart your MCP client
6. Start searching!

See [QUICK_START.md](QUICK_START.md) for detailed setup instructions.

## 📖 Documentation

- [README.md](README.md) - Comprehensive documentation
- [QUICK_START.md](QUICK_START.md) - 5-minute setup guide
- [EXAMPLES.md](EXAMPLES.md) - Usage examples
- [.github/README_TEMPLATES.md](.github/README_TEMPLATES.md) - Documentation templates

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

This project establishes a new standard for project documentation organization and AI agent search capabilities. Thank you to the MCP community for inspiration and feedback.

---

**Made for AI agents. Built for developers. Standard for everyone.**
