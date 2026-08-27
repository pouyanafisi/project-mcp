# API Reference

> Complete reference documentation for project-mcp tools, prompts, and resources.

This section provides detailed specifications for all project-mcp APIs.

## Documents

| Document | Description |
|----------|-------------|
| [**TOOLS.md**](./TOOLS.md) | All 40+ tools with parameters and examples |
| [**PROMPTS.md**](./PROMPTS.md) | Prompt templates for common workflows |
| [**SEARCH.md**](./SEARCH.md) | Search API and intent detection |
| [**RESOURCES.md**](./RESOURCES.md) | File resource protocol |

## Quick Reference

### Tool Categories

| Category | Count | Purpose |
|----------|-------|---------|
| [Search Tools](#search-tools) | 5 | Find and retrieve documentation |
| [Project Management](#project-management) | 8 | Manage `.project/` files |
| [Documentation](#documentation-tools) | 5 | Manage `docs/` files |
| [Task Management](#task-management) | 10 | Full task lifecycle |
| [Backlog](#backlog-tools) | 6 | Backlog queue management |
| [Decisions & Status](#decision--status) | 6 | ADRs and status tracking |
| [Quality](#quality-tools) | 1 | Documentation validation |

### Search Tools

```
search_project    - Intent-based search across all sources
search_docs       - Search only docs/ directory
get_doc           - Read specific file by path
list_docs         - List available documentation
get_doc_structure - Show directory structure
```

### Project Management

```
manage_project_file        - Smart file routing
check_project_state        - Verify file existence
create_or_update_roadmap   - ROADMAP.md management
create_or_update_todo      - TODO.md management
create_or_update_status    - STATUS.md management
create_or_update_index     - index.md management
create_or_update_decisions - DECISIONS.md management
init_project               - Initialize .project/
```

### Documentation Tools

```
create_doc             - Create new doc in docs/
update_doc             - Update existing doc
add_release_note       - Add release notes
update_architecture_doc - Architecture documentation
list_doc_categories    - List doc categories
```

### Task Management

```
create_task       - Create new active task
get_task          - Read task by ID
update_task       - Modify task fields
delete_task       - Remove task
list_tasks        - List/filter tasks
search_tasks      - Search by keyword
get_next_task     - Dependency-aware next task
archive_task      - Move to archive
unarchive_task    - Restore from archive
list_archived_tasks - View archive
sync_todo_index   - Regenerate TODO.md
```

### Backlog Tools

```
add_to_backlog      - Add single item
get_backlog         - Read with filtering
update_backlog_item - Modify item
remove_from_backlog - Delete item
import_tasks        - Bulk import from docs
promote_task        - Move to active
```

### Decision & Status

```
add_decision          - Record ADR
get_decision          - Read ADR by ID
list_decisions        - List/filter ADRs
update_project_status - Quick status update
add_roadmap_milestone - Add milestone
get_roadmap           - Read roadmap
```

### Quality Tools

```
lint_project_docs - Validate documentation
```

---

## Common Patterns

### Search Pattern

```json
{
  "tool": "search_project",
  "arguments": {
    "query": "authentication",
    "intent": "project_docs",
    "maxResults": 10
  }
}
```

### Task Creation Pattern

```json
{
  "tool": "create_task",
  "arguments": {
    "title": "Implement feature X",
    "project": "PROJ",
    "priority": "P1",
    "owner": "cursor"
  }
}
```

### Documentation Update Pattern

```json
{
  "tool": "update_doc",
  "arguments": {
    "path": "api/TOOLS.md",
    "content": "## New Section\n\nContent here...",
    "mode": "append"
  }
}
```

---

## Related Documentation

- [Architecture](../architecture/) — System design
- [Guides](../guides/) — Step-by-step tutorials
- [Reference](../reference/) — Configuration options

---

*See individual documents for detailed specifications.*

