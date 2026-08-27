# User Guides

> Step-by-step tutorials and workflow guides for project-mcp.

This section contains practical guides for using project-mcp effectively.

## Getting Started

| Guide                                          | Description                       | Time   |
| ---------------------------------------------- | --------------------------------- | ------ |
| [**GETTING_STARTED.md**](./GETTING_STARTED.md) | Install and configure project-mcp | 5 min  |
| [**PROJECT_SETUP.md**](./PROJECT_SETUP.md)     | Initialize your project structure | 10 min |

## Workflows

| Guide                                                        | Description                    | Time   |
| ------------------------------------------------------------ | ------------------------------ | ------ |
| [**TASK_MANAGEMENT.md**](./TASK_MANAGEMENT.md)               | Complete task lifecycle guide  | 15 min |
| [**DOCUMENTATION_WORKFLOW.md**](./DOCUMENTATION_WORKFLOW.md) | Managing project documentation | 10 min |
| [**SEARCH_GUIDE.md**](./SEARCH_GUIDE.md)                     | Effective searching techniques | 5 min  |

## Best Practices

| Guide                                        | Description                   |
| -------------------------------------------- | ----------------------------- |
| [**BEST_PRACTICES.md**](./BEST_PRACTICES.md) | Recommended patterns and tips |

## Quick Reference

### Common Workflows

```
New Project Setup:
  init_project → create_or_update_roadmap → import_tasks

Daily Task Work:
  get_next_task → update_task (in_progress) → update_task (done) → archive_task

Documentation Update:
  search_project → update_doc or update_project_status

Sprint Planning:
  get_backlog → promote_task (×n) → sync_todo_index
```

### Tool Selection Guide

| I want to...          | Use this tool                     |
| --------------------- | --------------------------------- |
| Find documentation    | `search_project` or `search_docs` |
| See project status    | `check_project_state`             |
| Create a new task     | `create_task` or `add_to_backlog` |
| Update task progress  | `update_task`                     |
| Record a decision     | `add_decision`                    |
| Update project status | `update_project_status`           |
| Add documentation     | `create_doc` or `update_doc`      |

---

## Related Documentation

- [API Reference](../api/) — Tool specifications
- [Architecture](../architecture/) — System design
- [Reference](../reference/) — Configuration options

---

_See individual guides for detailed instructions._
