# Documentation Templates

Use these templates to get started with proper project documentation structure.

## `.project/index.md` Template

```markdown
# Project Knowledge Index

## Contract for AI Agents

When a user says **"project"**, **"the project"**, or **"my project"**, the
canonical sources of truth are, in order:

1. **`.project/`** — Current state, plans, todos, decisions, operational truth
2. **Root markdown files** — README.md, DEVELOPMENT.md, ARCHITECTURE.md, etc.
3. **`docs/`** — Long-form reference documentation

## Source Mappings

### "project" / "the project" / "my project"

Searches (in order):

- `.project/` directory
- Root-level markdown files (README.md, DEVELOPMENT.md, ARCHITECTURE.md, etc.)
- `docs/` directory

### "docs" / "documentation" / "reference"

Searches only:

- `docs/` directory

### "plan" / "todos" / "roadmap" / "status" / "operational"

Searches only:

- `.project/` directory

## Principles

- **Natural language stays natural** - Users say "project" not ".project/"
- **Repo stays conventional** - Standard directory names
- **Agents don't guess** - Explicit mappings defined here
- **Intent over structure** - Language maps to intent, not directory names
```

## `.project/TODO.md` Template

```markdown
# TODO

## In Progress

- [ ] Task description
  - [ ] Subtask 1
  - [ ] Subtask 2

## Next Up

- [ ] Upcoming task
- [ ] Another task

## Blocked

- [ ] Blocked task (reason: waiting on X)

## Completed

- [x] Completed task
- [x] Another completed task
```

## `.project/ROADMAP.md` Template

```markdown
# Project Roadmap

## Current Quarter

### Phase 1: [Name] (Weeks 1-4)

- Goal 1
- Goal 2
- Goal 3

### Phase 2: [Name] (Weeks 5-8)

- Goal 1
- Goal 2

## Next Quarter

### Planned Features

- Feature 1
- Feature 2

## Future Considerations

- Long-term goal 1
- Long-term goal 2
```

## `.project/STATUS.md` Template

```markdown
# Project Status

**Last Updated:** [Date]

## Current Phase

[Phase Name] - [Brief description]

## Health

🟢 **Green** / 🟡 **Yellow** / 🔴 **Red**

## Recent Changes

- ✅ Completed: [What was done]
- 🔄 In progress: [What's happening now]
- 📋 Planned: [What's next]

## Metrics

- Test Coverage: X%
- Build Status: [Passing/Failing]
- Deployment: [Stable/Unstable]

## Risks & Blockers

- [Risk or blocker description]

## Next Milestone

[Description] by [Date]
```

## `docs/architecture/OVERVIEW.md` Template

```markdown
# System Architecture Overview

## High-Level Design

[Brief description of system architecture]

### Components

1. **Component 1** - [Description]
2. **Component 2** - [Description]
3. **Component 3** - [Description]

### Data Flow
```

[ASCII diagram or description]

```

## Technology Stack

- **Backend:** [Technology]
- **Database:** [Database]
- **Cache:** [Cache solution]
- **Queue:** [Queue solution]

## Scalability

[How the system scales]

## Security

[Security considerations]
```

## `docs/api/ENDPOINTS.md` Template

````markdown
# API Endpoints

## Authentication

### POST /api/auth/login

[Description]

**Request:**

```json
{
	"field": "value"
}
```
````

**Response:**

```json
{
	"field": "value"
}
```

**Status Codes:**

- `200` - Success
- `401` - Unauthorized
- `400` - Bad Request

````

## Best Practices

### Writing Good Documentation

1. **Use frontmatter** for metadata:
   ```markdown
   ---
   title: My Document
   description: Brief description
   ---
````

2. **Clear headings** - Use H1 for title, H2 for main sections

3. **Code examples** - Include working examples

4. **Keep it updated** - Outdated docs are worse than no docs

5. **Be specific** - Avoid vague descriptions

### Organizing `.project/` Files

- **Keep it current** - Remove completed items, update status
- **Be actionable** - Use clear, specific tasks
- **Include context** - Why, not just what
- **Regular updates** - Update at least weekly

### Organizing `docs/` Files

- **Comprehensive** - Cover topics fully
- **Stable** - Don't change frequently
- **Cross-reference** - Link related docs
- **Examples** - Include real-world examples
