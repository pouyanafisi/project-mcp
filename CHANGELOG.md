# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2024-12-29

### Added
- `BACKLOG.md` file for prioritized work queue (hundreds of items OK)
- `promote_task` tool to move backlog items to active YAML task files
- `archive_task` tool to move completed tasks to archive directory
- `archive/` directory for completed task history
- Phase filtering in `import_tasks` tool

### Changed
- **Breaking workflow change**: `import_tasks` now adds to `BACKLOG.md` instead of creating YAML files
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
- `sync_todo_index` now generates a dashboard view with stats and project summary
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

