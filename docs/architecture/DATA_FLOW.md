# Data Flow

> How data flows through project-mcp for different operations.

## Query Flow

### Search Query Processing

```
┌─────────────────────────────────────────────────────────────────┐
│                     1. USER QUERY                                │
│                 "What's the project status?"                     │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  2. INTENT DETECTION                             │
│                                                                  │
│  detectIntent(query, explicitIntent)                            │
│  ├─ Check for "project docs" pattern → "project_docs"           │
│  ├─ Check for decision keywords → "decisions"                   │
│  ├─ Check for operational keywords → "plan"         ◄── MATCH   │
│  ├─ Check for docs keywords → "docs"                            │
│  └─ Default → "project"                                         │
│                                                                  │
│  Result: intent = "plan"                                        │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  3. SOURCE MAPPING                               │
│                                                                  │
│  getSourcesForIntent("plan")                                    │
│  └─ INTENT_SOURCES["plan"] = ["project"]                        │
│                                                                  │
│  Result: sources = [".project/"]                                │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  4. FILE FILTERING                               │
│                                                                  │
│  allFilesCache.filter(file => sources.includes(file.source))    │
│                                                                  │
│  Filtered files:                                                 │
│  ├─ .project/STATUS.md                                          │
│  ├─ .project/TODO.md                                            │
│  ├─ .project/ROADMAP.md                                         │
│  └─ .project/BACKLOG.md                                         │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  5. FUZZY SEARCH                                 │
│                                                                  │
│  Fuse.js search with keys:                                      │
│  ├─ title                                                       │
│  ├─ content                                                     │
│  ├─ path                                                        │
│  └─ category                                                    │
│                                                                  │
│  Query: "status"                                                │
│  Threshold: 0.4 (40% match required)                            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  6. RESULT FORMATTING                            │
│                                                                  │
│  For each result:                                               │
│  ├─ Extract snippet around match                                │
│  ├─ Calculate relevance score                                   │
│  └─ Format as markdown                                          │
│                                                                  │
│  ## Project Status                                              │
│  **Path:** `.project/STATUS.md`                                 │
│  **Relevance:** 0.95                                            │
│  **Snippet:** Current phase: Development...                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Task Lifecycle Flow

### From Planning to Archive

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. PLANNING PHASE                             │
│                                                                  │
│  ROADMAP.md                                                     │
│  ┌─────────────────────────────────────────┐                    │
│  │ ## Q1 2025                              │                    │
│  │ - Implement OAuth                        │                    │
│  │ - Add API rate limiting                  │                    │
│  │ - Build dashboard UI                     │                    │
│  └─────────────────────────────────────────┘                    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              │ import_tasks(source: "ROADMAP.md")
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    2. BACKLOG PHASE                              │
│                                                                  │
│  BACKLOG.md                                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ | ID       | Title               | Priority | Phase    │    │
│  │ |----------|---------------------|----------|----------|    │
│  │ | AUTH-001 | Implement OAuth     | P0       | Q1 2025  │    │
│  │ | API-001  | Add rate limiting   | P1       | Q1 2025  │    │
│  │ | UI-001   | Build dashboard     | P2       | Q1 2025  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  (Hundreds of items OK here)                                    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              │ promote_task(task_id: "AUTH-001")
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    3. ACTIVE PHASE                               │
│                                                                  │
│  todos/AUTH-001.md                                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ---                                                      │    │
│  │ id: AUTH-001                                             │    │
│  │ title: Implement OAuth                                   │    │
│  │ priority: P0                                             │    │
│  │ status: todo                                             │    │
│  │ owner: cursor                                            │    │
│  │ depends_on: []                                           │    │
│  │ ---                                                      │    │
│  │                                                          │    │
│  │ # AUTH-001: Implement OAuth                              │    │
│  │ ## Subtasks                                              │    │
│  │ - [ ] Configure OAuth provider                           │    │
│  │ - [ ] Implement callback                                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  (Keep only 10-30 active tasks)                                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              │ update_task(id: "AUTH-001", 
                              │             status: "in_progress")
                              │ ...work happens...
                              │ update_task(id: "AUTH-001",
                              │             status: "done")
                              │
                              │ archive_task(task_id: "AUTH-001")
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    4. ARCHIVE PHASE                              │
│                                                                  │
│  archive/AUTH-001.md                                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ---                                                      │    │
│  │ id: AUTH-001                                             │    │
│  │ status: done                                             │    │
│  │ archived: 2025-01-15                                     │    │
│  │ ---                                                      │    │
│  │ ...full task history...                                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  (Preserved for reference)                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Update Flow

### Document Update Process

```
┌─────────────────────────────────────────────────────────────────┐
│               update_doc(path, content, mode)                    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    1. VALIDATE PATH                              │
│                                                                  │
│  path: "api/TOOLS.md"                                           │
│  fullPath: "/project/docs/api/TOOLS.md"                         │
│                                                                  │
│  Check: fileExists(fullPath) → true                             │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    2. READ EXISTING                              │
│                                                                  │
│  existingContent = readFile(fullPath)                           │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    3. APPLY MODE                                 │
│                                                                  │
│  mode: "append"                                                 │
│  ┌─────────────────────────────────────────┐                    │
│  │ APPEND:  existing + new                 │                    │
│  │ PREPEND: title + new + rest             │                    │
│  │ SECTION: find section, update content   │                    │
│  │ REPLACE: new content only               │                    │
│  └─────────────────────────────────────────┘                    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    4. UPDATE TIMESTAMP                           │
│                                                                  │
│  Replace: *Last Updated: ...* → *Last Updated: 2025-01-15*     │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    5. WRITE FILE                                 │
│                                                                  │
│  writeFile(fullPath, updatedContent)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Intent Source Mapping

```
Intent Type          →  Sources Searched
───────────────────────────────────────────────────────
"project"            →  .project/ + root + docs/
"docs"               →  docs/
"project_docs"       →  docs/ + .project/DECISIONS.md
"documentation"      →  docs/
"reference"          →  docs/
"architecture"       →  docs/
"plan"               →  .project/
"todos"              →  .project/
"roadmap"            →  .project/
"status"             →  .project/
"operational"        →  .project/
"management"         →  .project/
"decisions"          →  .project/DECISIONS.md
```

---

## Related Documentation

- [Overview](./OVERVIEW.md) — High-level architecture
- [Components](./COMPONENTS.md) — Component breakdown
- [Intent Mapping](../reference/INTENT_MAPPING.md) — Intent detection details

---

*Last Updated: January 2026*

