# Setup Instructions

## Quick Start

### Option 1: Using NPM Package (Recommended)

1. **Install the package**:

   ```bash
   npm install project-mcp
   ```

2. **Add to `.mcp.json`**:

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

3. **Restart your MCP client** to load the server

### Option 2: Using from Source

1. **Install dependencies**:

   ```bash
   cd mcp-project-server
   npm install
   ```

2. **Add to `.mcp.json`** (using absolute path):

   ```json
   {
   	"mcpServers": {
   		"project": {
   			"command": "node",
   			"args": ["/absolute/path/to/mcp-project-server/index.js"]
   		}
   	}
   }
   ```

   Or with working directory:

   ```json
   {
   	"mcpServers": {
   		"project": {
   			"command": "node",
   			"args": ["mcp-project-server/index.js"],
   			"cwd": "/absolute/path/to/project/root"
   		}
   	}
   }
   ```

## Custom Documentation Directory

By default, the server looks for a `docs/` directory in the current working directory. To use a different directory:

   ```json
   {
   	"mcpServers": {
   		"project": {
   			"command": "npx",
   			"args": ["-y", "project-mcp"],
   			"env": {
   				"DOCS_DIR": "/path/to/your/documentation"
   			}
   		}
   	}
   }
   ```

## How It Works

The MCP server:

1. Scans the documentation directory on startup
2. Indexes all Markdown files
3. Extracts titles, descriptions, and content
4. Builds a search index using Fuse.js for fuzzy matching
5. Provides tools for searching, listing, and retrieving documentation

## Features

- **Semantic Search**: Fuzzy matching with relevance scoring
- **Category Filtering**: Filter by documentation category (subdirectory names)
- **Full Document Access**: Retrieve complete files
- **Structure Overview**: Get documentation organization
- **Resource Access**: Files available as MCP resources via `docs://` URIs

## Troubleshooting

### Server won't start

- Check that Node.js is installed: `node --version` (requires Node 18+)
- Verify dependencies: `npm install`
- Check file permissions: `chmod +x index.js` (if using from source)

### No results in search

- Verify docs directory exists: `ls docs/` (or your custom directory)
- Check that Markdown files are present
- Try a broader search query
- Verify the working directory is correct in `.mcp.json`

### Path issues

- Use absolute paths in `.mcp.json` if relative paths don't work
- Set `cwd` in `.mcp.json` to ensure correct working directory
- Check `DOCS_DIR` environment variable if using custom directory

### Documentation not found

- Ensure your documentation directory contains `.md` files
- Check that the `DOCS_DIR` environment variable points to the correct location
- Verify the working directory (`cwd`) in `.mcp.json` is correct

## Testing

To test the server manually:

```bash
# From source
cd mcp-project-server
node index.js

# Should see: "Docs MCP server running on stdio (docs directory: /path/to/docs)"
```

## Development

To modify the server:

1. Edit `index.js`
2. Test locally: `node index.js`
3. Restart your MCP client to reload the server

## Publishing to NPM

If you want to publish your own version:

1. Update `package.json` with your details
2. Update version: `npm version patch|minor|major`
3. Publish: `npm publish`

## Dependencies

- `@modelcontextprotocol/sdk`: MCP SDK
- `fuse.js`: Fuzzy search
- `gray-matter`: Markdown frontmatter parsing
- `mime-types`: MIME type detection
