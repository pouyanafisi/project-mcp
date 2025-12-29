# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-12-29

### Breaking Changes

- **Entry point moved**: `index.js` → `src/index.js`
  - Update MCP server configurations to use `src/index.js`
  - The old monolithic `index.js` has been removed

### Added

- Modular architecture with organized codebase:
  - `src/lib/` - Shared utilities (constants, dates, files, search, tasks)
  - `src/tools/` - Tool handlers (search, project-files, tasks, backlog, lint)
  - `src/prompts/` - MCP prompt definitions and handlers
  - `src/resources/` - Resource handlers
  - `src/server.js` - Main ProjectMCPServer class
- Prettier code formatting with consistent style
- ToolSDK registry configuration (`toolsdk-registry.json`)
- `format` and `format:check` npm scripts

### Changed

- Codebase reorganized from monolithic 4019-line file to modular structure
- All JavaScript, Markdown, and JSON files formatted with Prettier
- Release notes moved to `docs/releases/` directory
- Improved code maintainability and developer experience

### Removed

- Legacy monolithic `index.js` (replaced by modular `src/` structure)
- Redundant documentation files (PRE_PUBLISH_CHECKLIST.md, PUBLISHING.md, REPOSITORY_IMPROVEMENTS.md)

## [1.4.2] - 2024-12-29

### Changed

- Add Prettier for consistent code formatting
- Format all JS, MD, and JSON files (37 files)
- Add `format` and `format:check` npm scripts

## [1.4.1] - 2024-12-29

### Changed

- Remove legacy monolithic `index.js` (4019 lines)
- Modular architecture now fully in `src/` directory

## [1.4.0] - 2024-12-29

### Added

- Modular architecture: break monolithic code into `src/lib/`, `src/tools/`, `src/prompts/`, `src/resources/`
- ToolSDK registry config (`toolsdk-registry.json`) for discoverability
- Entry point moved to `src/index.js` (15 lines vs 4019)

## [1.3.0] - 2024-12-29

### Added

- `BACKLOG.md` file for prioritized work queue (hundreds of items OK)
- `promote_task` tool to move backlog items to active YAML task files
- `archive_task` tool to move completed tasks to archive directory
- `archive/` directory for completed task history
- Phase filtering in `import_tasks` tool

### Changed

- **Breaking workflow change**: `import_tasks` now adds to `BACKLOG.md` instead
  of creating YAML files
- Active tasks in `todos/` should be kept to 10-30 items, not hundreds
- Updated `init_project` to create `BACKLOG.md` and `archive/` directory
- README updated with new backlog-first workflow documentation

### Architecture

- Tasks flow: ROADMAP → BACKLOG → todos/ → archive/
- Planning docs can have hundreds of items
- Only promoted (active) tasks become YAML files
- Keeps file system clean and agent execution queue focused

## [1.2.0] - 2024-12-29

### Added

- `init_project` tool for bootstrapping `.project/` with standard files
- `import_tasks` tool for parsing plans and generating YAML task files
- Standard templates for index.md, ROADMAP.md, STATUS.md, DECISIONS.md, TODO.md
- Dry-run mode for task import preview
- Priority inference from keywords (critical, high, medium, low)
- Dependency inference from document structure
- Tag extraction from bracket notation in task titles

### Changed

- README updated with new tool documentation and examples

## [1.1.0] - 2024-12-29

### Added

- Task management system with YAML frontmatter
- `create_task` tool for creating tasks with Jira-like IDs (e.g., AUTH-001)
- `update_task` tool for modifying task fields and status transitions
- `get_next_task` tool for dependency-aware task selection
- `list_tasks` tool for filtering and listing tasks with dashboard view
- `lint_project_docs` tool for validating documentation standards
- Dependency tracking (`depends_on` array) for task ordering
- Status workflow: todo → in_progress → blocked | review → done
- Priority levels: P0 (critical), P1 (high), P2 (medium), P3 (low)
- Subtask checklists within tasks
- Auto-fix capabilities in documentation linting
- Strict mode for enhanced validation
- README table of contents

### Changed

- `sync_todo_index` now generates a dashboard view with stats and project
  summary
- Improved README organization and documentation

### Removed

- `create_or_update_owner_todo` (replaced by `create_task`)

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
