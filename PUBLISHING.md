# Publishing Guide

## Pre-Publishing Checklist

- [x] Package name is generic (`project-mcp`)
- [x] No hardcoded paths or project-specific references
- [x] Uses `process.cwd()` for default directory
- [x] Supports `DOCS_DIR` environment variable
- [x] README is generic and clear
- [x] LICENSE file included
- [x] `.npmignore` configured
- [x] `package.json` has correct metadata

## Publishing Steps

1. **Update version** (if needed):
   ```bash
   npm version patch  # for bug fixes
   npm version minor  # for new features
   npm version major  # for breaking changes
   ```

2. **Login to NPM** (if not already):
   ```bash
   npm login
   ```

3. **Publish**:
   ```bash
   npm publish
   ```

4. **Verify**:
   ```bash
   npm view project-mcp
   ```

## Post-Publishing

After publishing, users can install and use it with:

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

## Updating the Package

1. Make changes to the code
2. Update version: `npm version patch|minor|major`
3. Publish: `npm publish`

## Notes

- The package is scoped to the global namespace (`project-mcp`)
- Make sure you have publish rights to the package name
- Consider using a scoped package (`@your-org/project-mcp`) if you want organization control

