# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-29

### Added
- Initial release of project-mcp
- Intent-based search across multiple sources (.project/, root files, docs/)
- `search_project` tool with automatic intent detection
- `search_docs` tool for reference documentation only
- `get_doc` tool for retrieving full file contents
- `list_docs` tool for browsing documentation
- `get_doc_structure` tool for understanding documentation organization
- Support for Markdown files with frontmatter
- Fuzzy search using Fuse.js
- Resource access via MCP resources
- Automatic source mapping based on user intent:
  - "project" → searches .project/, root files, and docs/
  - "docs" → searches only docs/
  - "plan/todos/roadmap/status" → searches only .project/
- Support for custom documentation directory via `DOCS_DIR` environment variable

### Features
- Semantic search with relevance scoring
- Category-based filtering
- Multi-source indexing
- Automatic title and description extraction
- Content snippet generation for search results

