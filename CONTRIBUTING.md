# Contributing to Project MCP

Thank you for your interest in contributing to Project MCP! This document provides guidelines and instructions for contributing.

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/yourusername/project-mcp/issues)
2. If not, create a new issue with:
   - A clear, descriptive title
   - Steps to reproduce the bug
   - Expected vs. actual behavior
   - Environment details (Node.js version, OS, etc.)
   - Any relevant error messages or logs

### Suggesting Features

1. Check if the feature has already been suggested
2. Create a new issue with:
   - A clear description of the feature
   - Use cases and examples
   - Why this feature would be valuable

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes**:
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation as needed
4. **Test your changes**: `npm test`
5. **Commit your changes**: Use clear, descriptive commit messages
6. **Push to your fork**: `git push origin feature/your-feature-name`
7. **Create a Pull Request** with:
   - A clear description of changes
   - Reference to related issues
   - Screenshots/examples if applicable

## Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/project-mcp.git
cd project-mcp

# Install dependencies
npm install

# Run tests
npm test

# Test the server locally
node index.js
```

## Code Style

- Use ES modules (import/export)
- Follow existing code formatting
- Use meaningful variable and function names
- Add JSDoc comments for public functions
- Keep functions focused and single-purpose

## Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Add tests for edge cases and error conditions

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `test:` for test additions/changes
- `refactor:` for code refactoring
- `chore:` for maintenance tasks

Example: `feat: add support for custom source directories`

## Questions?

Feel free to open an issue for any questions about contributing!

