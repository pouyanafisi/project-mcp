# Pre-Publish Checklist

Before publishing to NPM, ensure the following:

## ✅ Package Configuration

- [x] `package.json` has complete metadata
- [x] Repository URL is set (update with your actual repo)
- [x] Bugs URL is set
- [x] Homepage URL is set
- [x] Keywords are comprehensive
- [x] `files` array includes only necessary files
- [x] `.npmignore` excludes development files

## ✅ Documentation

- [x] README.md is comprehensive and up-to-date
- [x] CHANGELOG.md has initial version
- [x] CONTRIBUTING.md exists
- [x] SECURITY.md exists
- [x] CODE_OF_CONDUCT.md exists
- [x] LICENSE file exists (MIT)
- [x] EXAMPLES.md provides usage examples

## ✅ Code Quality

- [x] Code is linted and formatted
- [x] JSDoc comments added to key functions
- [x] Error handling is robust
- [x] No hardcoded paths or project-specific references

## ✅ Testing

- [x] Test suite exists (`test/basic.test.js`)
- [x] Tests pass (`npm test`)
- [x] Pre-publish script runs tests

## ✅ CI/CD

- [x] GitHub Actions workflow for CI
- [x] GitHub Actions workflow for publishing
- [x] Tests run on multiple Node.js versions

## ✅ GitHub Templates

- [x] Bug report template
- [x] Feature request template
- [x] Pull request template

## ⚠️ Before Publishing

1. **Update repository URLs** in `package.json`:

   ```json
   "repository": {
     "type": "git",
     "url": "https://github.com/yourusername/project-mcp.git"
   }
   ```

2. **Set NPM_TOKEN secret** in GitHub repository settings for automated
   publishing

3. **Verify package name availability** on NPM:

   ```bash
   npm view project-mcp
   ```

4. **Test locally**:

   ```bash
   npm pack
   npm install -g ./project-mcp-1.0.0.tgz
   ```

5. **Create initial git repository** (if not already done):

   ```bash
   git init
   git add .
   git commit -m "Initial release"
   git remote add origin https://github.com/yourusername/project-mcp.git
   git push -u origin main
   ```

6. **Create first release** on GitHub to trigger NPM publish workflow

## Publishing Steps

1. Update version if needed:

   ```bash
   npm version patch|minor|major
   ```

2. Push to GitHub:

   ```bash
   git push && git push --tags
   ```

3. Create GitHub Release (triggers publish workflow)

Or publish manually:

```bash
npm login
npm publish
```

## Post-Publish

- [ ] Verify package appears on NPM
- [ ] Test installation: `npm install project-mcp`
- [ ] Update documentation with actual repository URL
- [ ] Announce on social media / communities
