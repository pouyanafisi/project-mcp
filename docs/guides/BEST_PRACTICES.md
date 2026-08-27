# Best Practices

> Recommended patterns and tips for effective use of project-mcp.

## General Principles

### 1. Separation of Concerns

Keep operational tracking separate from reference documentation:

| Don't Mix                               | Instead                     |
| --------------------------------------- | --------------------------- |
| "Status: Feature X is done" in API docs | Update `.project/STATUS.md` |
| Implementation details in STATUS.md     | Put in `docs/architecture/` |

### 2. Backlog-First for Tasks

```
❌ Create 50 active tasks
✅ Add to BACKLOG.md, promote as needed

❌ One huge TODO.md file
✅ Individual task files in todos/
```

### 3. Intent-Aware Searching

Let intent detection work for you:

```json
// Let system detect intent
{ "query": "authentication implementation" }

// Or be explicit when needed
{ "query": "authentication", "intent": "docs" }
```

---

## Documentation Practices

### Directory Structure

Every documentation directory should have:

```
category/
├── README.md       # Index with document list
├── OVERVIEW.md     # High-level introduction
└── SPECIFIC.md     # Detailed topics
```

### Document Templates

#### Guide Template

```markdown
# Title

> One-line description

## Prerequisites

What you need before starting...

## Steps

### Step 1: First Thing

Details...

### Step 2: Second Thing

Details...

## Next Steps

- [Related Guide](./related.md)

---

_Last Updated: Month Year_
```

#### Reference Template

```markdown
# Title

> One-line description

## Overview

What this covers...

## Details

### Section 1

Technical details...

### Section 2

More details...

## Related

- [Other Doc](./other.md)

---

_Last Updated: Month Year_
```

### Cross-Referencing

Always link related documentation:

```markdown
## Related Documentation

- [Architecture Overview](../architecture/OVERVIEW.md) - System design
- [API Reference](../api/TOOLS.md) - Tool specifications
```

---

## Task Management Practices

### Task Sizing

| Size      | Estimate  | Guidance                 |
| --------- | --------- | ------------------------ |
| Small     | < 2 hours | Single focused change    |
| Medium    | 2-4 hours | Multiple related changes |
| Large     | 4-8 hours | Consider splitting       |
| Too Large | > 8 hours | Must split               |

### Task Naming

```
✅ "Implement OAuth login for Google accounts"
✅ "Fix XSS vulnerability in user input field"
✅ "Add rate limiting to /api/users endpoint"

❌ "OAuth"
❌ "Fix bug"
❌ "API work"
```

### Dependencies

```
✅ Minimize chains: A → B (two levels max)
✅ Clear dependency: "Needs API-001 for endpoints"

❌ Long chains: A → B → C → D → E
❌ Circular: A → B → A
```

### Status Updates

Update status at natural breakpoints:

```
Start work      → status: "in_progress"
Hit blocker     → status: "blocked", add blocked_by
Ready for review → status: "review"
Completed       → status: "done"
Archive promptly → archive_task
```

---

## Search Practices

### Effective Queries

```json
// Good: Specific and contextual
{ "query": "authentication flow implementation" }
{ "query": "how does rate limiting work" }

// Less effective: Too vague
{ "query": "auth" }
{ "query": "API" }
```

### When to Use Which Tool

| Goal                      | Tool             | Intent    |
| ------------------------- | ---------------- | --------- |
| Find anything about topic | `search_project` | auto      |
| Find reference docs       | `search_docs`    | -         |
| Check project status      | `search_project` | plan      |
| Find decisions            | `search_project` | decisions |

---

## Decision Recording

### When to Record Decisions

Always record when you:

- Choose between alternatives
- Make a trade-off
- Establish a pattern
- Decide against something

### Decision Format

```json
{
	"tool": "add_decision",
	"arguments": {
		"title": "Use JWT for session management",
		"context": "Need stateless authentication for API",
		"decision": "We will use JWT tokens with 1-hour expiry",
		"consequences": "Positive: Stateless, scalable\nNegative: Can't revoke individual tokens",
		"tags": ["security", "authentication"]
	}
}
```

### Decision vs Architecture Doc

| Use Decision Record            | Use Architecture Doc    |
| ------------------------------ | ----------------------- |
| "We chose X over Y because..." | "Here's how X works..." |
| Point-in-time choice           | Living documentation    |
| Brief, focused                 | Comprehensive           |

---

## Project Status

### Update Frequency

| Type      | Frequency     | What to Include               |
| --------- | ------------- | ----------------------------- |
| Daily     | End of day    | What was done                 |
| Weekly    | Friday        | Progress, blockers, next week |
| Milestone | On completion | Summary, metrics              |

### Status Content

```json
{
	"status": "Completed OAuth integration", // What happened
	"health": "green", // Overall health
	"changes": [
		// Specific changes
		"Added Google OAuth provider",
		"Implemented token refresh"
	],
	"blockers": [], // Current blockers
	"next_milestone": "User dashboard" // What's next
}
```

---

## Workflow Patterns

### Daily Development

```
Morning:
  get_next_task → Find what to work on
  update_task (in_progress) → Start work

During:
  [do the work]
  update_task (subtasks) → Track progress

End of day:
  update_task (done) or leave in_progress
  update_project_status (if significant progress)
```

### Feature Development

```
1. add_to_backlog or promote_task → Create task
2. add_decision → Record design choices
3. update_task → Track progress
4. archive_task → Complete task
5. create_doc or update_doc → Document feature
6. update_project_status → Record completion
```

### Release Preparation

```
1. list_archived_tasks → Review completed
2. lint_project_docs → Validate docs
3. add_release_note → Create notes
4. update_project_status → Record release
```

---

## Common Mistakes

### ❌ Too Many Active Tasks

**Problem:** 50+ task files in todos/

**Solution:** Keep 10-30 active, use BACKLOG.md for queue

### ❌ Mixing Operational and Reference

**Problem:** Implementation details in STATUS.md

**Solution:** Use docs/ for reference, .project/ for tracking

### ❌ No Cross-References

**Problem:** Documents exist in isolation

**Solution:** Add "Related Documentation" sections

### ❌ Outdated Documentation

**Problem:** Docs don't match reality

**Solution:** Update docs as part of feature completion

### ❌ Vague Task Titles

**Problem:** "Fix bug" tells you nothing

**Solution:** "Fix XSS vulnerability in login form"

---

## Quick Reference

### Tool Selection

| I want to...          | Tool                              |
| --------------------- | --------------------------------- |
| Search everything     | `search_project`                  |
| Search docs only      | `search_docs`                     |
| Update project status | `update_project_status`           |
| Record a decision     | `add_decision`                    |
| Create new doc        | `create_doc`                      |
| Update existing doc   | `update_doc`                      |
| Create task           | `create_task` or `add_to_backlog` |
| Find next task        | `get_next_task`                   |

### Status Health

| Color     | Meaning         |
| --------- | --------------- |
| 🟢 Green  | On track        |
| 🟡 Yellow | Minor issues    |
| 🔴 Red    | Blocked/at risk |

### Priority Levels

| Level | Meaning  | Response      |
| ----- | -------- | ------------- |
| P0    | Critical | Immediate     |
| P1    | High     | This sprint   |
| P2    | Medium   | Soon          |
| P3    | Low      | When possible |

---

## Related Documentation

- [Getting Started](./GETTING_STARTED.md) — Installation
- [Task Management](./TASK_MANAGEMENT.md) — Task workflow
- [Documentation Workflow](./DOCUMENTATION_WORKFLOW.md) — Managing docs

---

_Last Updated: January 2026_
