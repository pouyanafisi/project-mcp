# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions receive security
updates depends on the severity of the vulnerability.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please **do not** open a public issue.
Instead, please report it via one of the following methods:

1. **Email**: Send details to [security@yourdomain.com]
2. **GitHub Security Advisory**: Use the "Report a vulnerability" button on the
   repository's Security tab

### What to Include

When reporting a vulnerability, please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)
- Your contact information

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution**: Depends on severity and complexity

### Security Best Practices

When using this package:

- Keep dependencies up to date: `npm audit`
- Review file paths before accessing files
- Validate user input when using custom `DOCS_DIR`
- Run the server with appropriate file system permissions
- Don't expose sensitive files in `.project/` or `docs/` directories

## Known Security Considerations

- The server reads files from the file system based on the project structure
- File paths are resolved relative to the current working directory
- No authentication is performed - the server trusts the MCP client
- The server does not execute code from documentation files
