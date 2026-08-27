# System Components

> Detailed breakdown of project-mcp components and their responsibilities.

## Component Overview

```
project-mcp/
├── src/
│   ├── index.js          # Entry point
│   ├── server.js         # MCP server implementation
│   ├── tools/            # Tool implementations
│   │   ├── index.js      # Tool registry
│   │   ├── search.js     # Search tools
│   │   ├── project-files.js  # .project/ management
│   │   ├── docs.js       # docs/ management
│   │   ├── tasks.js      # Task management
│   │   ├── backlog.js    # Backlog management
│   │   ├── thoughts.js   # Thought capture
│   │   └── lint.js       # Documentation validation
│   ├── prompts/          # Prompt templates
│   │   ├── index.js      # Prompt registry
│   │   └── definitions.js # Prompt definitions
│   ├── resources/        # Resource providers
│   │   └── index.js      # File resources
│   └── lib/              # Shared utilities
│       ├── index.js      # Library exports
│       ├── constants.js  # Configuration
│       ├── files.js      # File operations
│       ├── search.js     # Search engine
│       ├── dates.js      # Date utilities
│       └── tasks.js      # Task utilities
```

---

## Core Components

### Entry Point (`src/index.js`)

Initializes and starts the MCP server:

```javascript
import { startServer } from './server.js';
startServer();
```

### Server (`src/server.js`)

The MCP protocol implementation:

**Responsibilities:**
- Register tools, prompts, and resources
- Handle incoming requests
- Route to appropriate handlers
- Format responses

**Key Methods:**
- `handleToolCall(name, args)` — Execute tools
- `handleGetPrompt(name, args)` — Generate prompts
- `handleReadResource(uri)` — Serve resources

---

## Tool Modules

### Search Tools (`src/tools/search.js`)

**Tools Provided:**
| Tool | Purpose |
|------|---------|
| `search_project` | Intent-based search across all sources |
| `search_docs` | Search only `docs/` directory |
| `get_doc` | Read specific file by path |
| `list_docs` | List available documentation |
| `get_doc_structure` | Show directory structure |

**Key Features:**
- Fuse.js fuzzy search
- Intent detection from query
- Source filtering by intent
- Snippet extraction

### Project Files (`src/tools/project-files.js`)

**Tools Provided:**
| Tool | Purpose |
|------|---------|
| `manage_project_file` | Smart file routing |
| `check_project_state` | Verify file existence |
| `create_or_update_*` | CRUD for each file type |
| `add_decision` | ADR management |
| `update_project_status` | Status updates |
| `add_roadmap_milestone` | Roadmap management |

**Key Features:**
- Automatic file type detection
- Content merging (not overwriting)
- Timestamp management
- ADR numbering

### Documentation Tools (`src/tools/docs.js`)

**Tools Provided:**
| Tool | Purpose |
|------|---------|
| `create_doc` | Create new documentation |
| `update_doc` | Update existing docs |
| `add_release_note` | Version release notes |
| `update_architecture_doc` | Architecture documentation |
| `list_doc_categories` | List doc categories |

**Key Features:**
- Directory auto-creation
- Multiple update modes (append, prepend, section, replace)
- Release note formatting
- Category organization

### Task Management (`src/tools/tasks.js`)

**Tools Provided:**
| Tool | Purpose |
|------|---------|
| `create_task` | Create new active task |
| `get_task` | Read task by ID |
| `update_task` | Modify task fields |
| `delete_task` | Remove task |
| `list_tasks` | List/filter tasks |
| `search_tasks` | Search by keyword |
| `get_next_task` | Dependency-aware next task |
| `archive_task` | Move to archive |
| `unarchive_task` | Restore from archive |
| `list_archived_tasks` | View archive |
| `sync_todo_index` | Regenerate TODO.md |

**Key Features:**
- YAML frontmatter parsing
- Dependency resolution
- Priority sorting (P0-P3)
- Status workflow enforcement
- Archive management

### Backlog Management (`src/tools/backlog.js`)

**Tools Provided:**
| Tool | Purpose |
|------|---------|
| `add_to_backlog` | Add single item |
| `get_backlog` | Read with filtering |
| `update_backlog_item` | Modify item |
| `remove_from_backlog` | Delete item |
| `import_tasks` | Bulk import from docs |
| `promote_task` | Move to active |

**Key Features:**
- Markdown table format
- Priority levels
- Phase grouping
- Tag support
- Bulk import parsing

### Thought Capture (`src/tools/thoughts.js`)

**Tools Provided:**
| Tool | Purpose |
|------|---------|
| `list_thoughts` | List active thoughts |
| `list_archived_thoughts` | List archived |
| `get_thought` | Read specific thought |
| `process_thoughts` | Review and convert |
| `archive_thought` | Archive processed |

**Key Features:**
- Quick capture format
- Conversion to tasks
- Archive management

### Linting (`src/tools/lint.js`)

**Tools Provided:**
| Tool | Purpose |
|------|---------|
| `lint_project_docs` | Validate documentation |

**Key Features:**
- Structure validation
- Required file checks
- Format validation
- Issue reporting

---

## Library Modules

### Constants (`src/lib/constants.js`)

**Exports:**
- `PROJECT_ROOT` — Working directory
- `DOCS_DIR` — Documentation directory
- `PROJECT_DIR` — `.project/` directory
- `INTENT_SOURCES` — Intent to source mapping
- `VALID_STATUSES` — Task status values
- `VALID_PRIORITIES` — Priority levels

### Files (`src/lib/files.js`)

**Exports:**
- `ensureProjectDir()` — Create `.project/`
- `fileExists()` — Check file existence
- `readMarkdownFile()` — Parse with frontmatter
- `writeMarkdownFile()` — Write with frontmatter
- `scanDirectory()` — Recursive file listing

### Search (`src/lib/search.js`)

**Exports:**
- `detectIntent()` — Query intent detection
- `getSourcesForIntent()` — Map intent to sources
- `loadAllFiles()` — Index all documentation
- `searchFiles()` — Execute search
- `extractSnippet()` — Generate preview

### Tasks (`src/lib/tasks.js`)

**Exports:**
- `parseTask()` — Parse task file
- `formatTask()` — Format for writing
- `generateTaskId()` — Create unique ID
- `validateTask()` — Validate task data
- `sortByPriority()` — Priority sorting

---

## Component Interactions

```
┌─────────────────────────────────────────────────────────┐
│                      server.js                           │
│                   (Request Handler)                      │
└─────────────────────────┬───────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  tools/  │    │ prompts/ │    │resources/│
    │ index.js │    │ index.js │    │ index.js │
    └────┬─────┘    └──────────┘    └──────────┘
         │
    ┌────┴────────────────────────────────┐
    │         Tool Modules                 │
    │  search | project-files | docs |     │
    │  tasks | backlog | thoughts | lint   │
    └────┬────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │           lib/ Utilities             │
    │  constants | files | search | tasks  │
    └──────────────────────────────────────┘
```

---

## Related Documentation

- [Overview](./OVERVIEW.md) — High-level architecture
- [Data Flow](./DATA_FLOW.md) — Detailed flow diagrams
- [API Reference](../api/TOOLS.md) — Tool specifications

---

*Last Updated: January 2026*

