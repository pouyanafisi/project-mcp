/**
 * Linting and initialization tools.
 * Handles: lint_project_docs, init_project
 */

import { PROJECT_DIR, TODOS_DIR, ARCHIVE_DIR, VALID_STATUSES, VALID_PRIORITIES } from '../lib/constants.js';
import {
	readFile,
	writeFile,
	join,
	ensureProjectDir,
	ensureTodosDir,
	ensureArchiveDir,
	fileExists,
} from '../lib/files.js';
import { getCurrentDate, getISODate, isValidDateFormat, isDateInPast } from '../lib/dates.js';
import { loadAllTasks, normalizePriority } from '../lib/tasks.js';

/**
 * Tool definitions
 */
export const definitions = [
	{
		name: 'lint_project_docs',
		description:
			'Validates project documentation against standards. Checks for required files, valid frontmatter, broken dependencies, missing fields, and formatting issues. Can auto-fix common problems. Run this before commits to ensure documentation quality.',
		inputSchema: {
			type: 'object',
			properties: {
				fix: {
					type: 'boolean',
					description:
						'If true, automatically fix issues that can be auto-corrected (missing timestamps, formatting, etc.). Default: false (report only).',
					default: false,
				},
				strict: {
					type: 'boolean',
					description:
						'If true, enforce stricter rules (all tasks must have estimates, due dates, descriptions). Default: false.',
					default: false,
				},
				scope: {
					type: 'string',
					description:
						'What to lint: "all" (everything), "tasks" (only task files), "docs" (only documentation files). Default: "all".',
					enum: ['all', 'tasks', 'docs'],
					default: 'all',
				},
			},
		},
	},
	{
		name: 'init_project',
		description:
			'Initializes the .project/ directory with all standard files following strict templates. Creates index.md (contract), TODO.md (dashboard), BACKLOG.md (prioritized work queue), ROADMAP.md, STATUS.md, DECISIONS.md, and todos/ directory. Use this to bootstrap a new project with proper structure.',
		inputSchema: {
			type: 'object',
			properties: {
				project_name: {
					type: 'string',
					description: 'Name of the project. Used in headers and metadata.',
				},
				project_description: {
					type: 'string',
					description: 'Brief description of the project.',
				},
				overwrite: {
					type: 'boolean',
					description: 'If true, overwrites existing files. Default: false (skip existing).',
					default: false,
				},
			},
			required: ['project_name'],
		},
	},
];

/**
 * Lint project docs handler
 */
async function lintProjectDocs(args) {
	const { fix = false, strict = false, scope = 'all' } = args || {};
	await ensureProjectDir();

	const issues = [];
	const fixed = [];
	const warnings = [];

	// Define required documentation files
	const requiredDocs = [
		{ file: 'index.md', name: 'Contract file', required: ['# ', 'Intent'] },
		{ file: 'TODO.md', name: 'Todo index', required: ['# TODO'] },
		{ file: 'ROADMAP.md', name: 'Roadmap', required: ['# '] },
		{ file: 'STATUS.md', name: 'Status', required: ['# '] },
		{ file: 'DECISIONS.md', name: 'Decisions log', required: ['# '] },
	];

	// Check documentation files
	if (scope === 'all' || scope === 'docs') {
		for (const doc of requiredDocs) {
			const docPath = join(PROJECT_DIR, doc.file);
			const exists = await fileExists(docPath);

			if (!exists) {
				issues.push({
					type: 'error',
					file: doc.file,
					message: `Missing required file: ${doc.name}`,
					fix: `Run the appropriate create_or_update_* tool to create ${doc.file}`,
				});
			} else {
				const content = await readFile(docPath, 'utf-8');

				// Check for required content patterns
				for (const pattern of doc.required) {
					if (!content.includes(pattern)) {
						warnings.push({
							type: 'warning',
							file: doc.file,
							message: `Missing expected content pattern: "${pattern}"`,
						});
					}
				}

				// Check for timestamp
				if (!content.includes('Last Updated:') && !content.includes('updated:')) {
					if (fix) {
						const updatedContent = content + `\n\n---\n*Last Updated: ${getCurrentDate()}*\n`;
						await writeFile(docPath, updatedContent, 'utf-8');
						fixed.push({ file: doc.file, action: 'Added timestamp' });
					} else {
						issues.push({
							type: 'warning',
							file: doc.file,
							message: 'Missing timestamp',
							fix: 'Add *Last Updated: DATE* to the file',
						});
					}
				}
			}
		}
	}

	// Check task files
	if (scope === 'all' || scope === 'tasks') {
		const tasks = await loadAllTasks();
		const taskIds = new Set(tasks.map(t => t.id));

		// Required task fields
		const requiredFields = ['id', 'title', 'project', 'status', 'priority'];
		const strictFields = ['owner', 'estimate', 'description'];

		for (const task of tasks) {
			const taskFile = `todos/${task.file}`;

			// Check required fields
			for (const field of requiredFields) {
				if (!task[field]) {
					issues.push({
						type: 'error',
						file: taskFile,
						message: `Missing required field: ${field}`,
						fix: `Add ${field} to frontmatter`,
					});
				}
			}

			// Strict mode checks
			if (strict) {
				for (const field of strictFields) {
					if (!task[field]) {
						warnings.push({
							type: 'warning',
							file: taskFile,
							message: `Missing recommended field: ${field} (strict mode)`,
						});
					}
				}
			}

			// Validate status
			if (task.status && !VALID_STATUSES.includes(task.status)) {
				issues.push({
					type: 'error',
					file: taskFile,
					message: `Invalid status: "${task.status}". Must be one of: ${VALID_STATUSES.join(', ')}`,
					fix: 'Update status to a valid value',
				});
			}

			// Validate priority
			if (task.priority && !VALID_PRIORITIES.includes(task.priority)) {
				if (fix) {
					const normalized = normalizePriority(task.priority);
					const filePath = join(TODOS_DIR, task.file);
					let content = await readFile(filePath, 'utf-8');
					content = content.replace(/priority:\s*.+/, `priority: ${normalized}`);
					await writeFile(filePath, content, 'utf-8');
					fixed.push({ file: taskFile, action: `Normalized priority to ${normalized}` });
				} else {
					issues.push({
						type: 'error',
						file: taskFile,
						message: `Invalid priority: "${task.priority}". Must be one of: ${VALID_PRIORITIES.join(', ')}`,
						fix: 'Use P0, P1, P2, or P3',
					});
				}
			}

			// Check for broken dependencies
			if (task.depends_on && Array.isArray(task.depends_on)) {
				for (const depId of task.depends_on) {
					if (!taskIds.has(depId)) {
						issues.push({
							type: 'error',
							file: taskFile,
							message: `Broken dependency: "${depId}" does not exist`,
							fix: `Remove ${depId} from depends_on or create the missing task`,
						});
					}
				}
			}

			// Check for circular dependencies
			if (task.depends_on && task.depends_on.includes(task.id)) {
				issues.push({
					type: 'error',
					file: taskFile,
					message: 'Circular dependency: task depends on itself',
					fix: 'Remove self-reference from depends_on',
				});
			}

			// Check for missing updated timestamp
			if (!task.updated) {
				if (fix) {
					const filePath = join(TODOS_DIR, task.file);
					let content = await readFile(filePath, 'utf-8');
					if (content.includes('created:') && !content.includes('updated:')) {
						content = content.replace(/(created:\s*.+)/, `$1\nupdated: ${getISODate()}`);
						await writeFile(filePath, content, 'utf-8');
						fixed.push({ file: taskFile, action: 'Added updated timestamp' });
					}
				} else {
					warnings.push({
						type: 'warning',
						file: taskFile,
						message: 'Missing updated timestamp in frontmatter',
					});
				}
			}

			// Check ID matches filename
			const expectedFilename = `${task.id}.md`;
			if (task.file !== expectedFilename) {
				issues.push({
					type: 'error',
					file: taskFile,
					message: `Filename "${task.file}" doesn't match task ID "${task.id}"`,
					fix: `Rename file to ${expectedFilename}`,
				});
			}

			// Check due date format if present
			if (task.due && !isValidDateFormat(task.due)) {
				issues.push({
					type: 'warning',
					file: taskFile,
					message: `Invalid due date format: "${task.due}". Expected YYYY-MM-DD`,
					fix: 'Update due date to YYYY-MM-DD format',
				});
			}

			// Check for overdue tasks
			if (task.due && task.status !== 'done' && isDateInPast(task.due)) {
				warnings.push({
					type: 'warning',
					file: taskFile,
					message: `Task is overdue (due: ${task.due})`,
				});
			}
		}

		// Check for orphaned tasks (done tasks that others depend on)
		for (const task of tasks) {
			if (task.status === 'done' && task.depends_on?.length > 0) {
				const unresolvedDeps = task.depends_on.filter(depId => {
					const dep = tasks.find(t => t.id === depId);
					return dep && dep.status !== 'done';
				});
				if (unresolvedDeps.length > 0) {
					warnings.push({
						type: 'warning',
						file: `todos/${task.file}`,
						message: `Task marked done but has unresolved dependencies: ${unresolvedDeps.join(', ')}`,
					});
				}
			}
		}
	}

	// Build result
	const errorCount = issues.filter(i => i.type === 'error').length;
	const warningCount = issues.filter(i => i.type === 'warning').length + warnings.length;

	let result = `## Documentation Lint Results\n\n`;
	result += `**Scope:** ${scope} | **Strict:** ${strict} | **Auto-fix:** ${fix}\n\n`;

	if (errorCount === 0 && warningCount === 0) {
		result += `✅ **All checks passed!** Documentation conforms to standards.\n`;
	} else {
		result += `| Type | Count |\n|------|-------|\n`;
		result += `| 🔴 Errors | ${errorCount} |\n`;
		result += `| 🟡 Warnings | ${warningCount} |\n\n`;
	}

	if (fixed.length > 0) {
		result += `### ✅ Auto-fixed (${fixed.length})\n\n`;
		for (const f of fixed) {
			result += `- \`${f.file}\`: ${f.action}\n`;
		}
		result += '\n';
	}

	if (issues.length > 0) {
		result += `### 🔴 Issues\n\n`;
		for (const issue of issues) {
			result += `**${issue.file}**\n`;
			result += `- ${issue.type === 'error' ? '❌' : '⚠️'} ${issue.message}\n`;
			if (issue.fix) result += `  - Fix: ${issue.fix}\n`;
			result += '\n';
		}
	}

	if (warnings.length > 0) {
		result += `### 🟡 Warnings\n\n`;
		for (const warn of warnings) {
			result += `- \`${warn.file}\`: ${warn.message}\n`;
		}
		result += '\n';
	}

	if (errorCount > 0) {
		result += `---\n\n⚠️ **${errorCount} error(s) found.** Run with \`fix: true\` to auto-fix where possible.\n`;
	}

	return {
		content: [{ type: 'text', text: result }],
	};
}

/**
 * Init project handler
 */
async function initProject(args) {
	const { project_name, project_description = '', overwrite = false } = args;
	const date = getCurrentDate();

	const files = [];
	const skipped = [];

	// Ensure directories exist
	await ensureProjectDir();
	await ensureTodosDir();
	await ensureArchiveDir();

	// Standard file templates
	const templates = {
		'index.md': `---
title: ${project_name} - Project Index
created: ${getISODate()}
updated: ${getISODate()}
---

# ${project_name}

${project_description}

## Contract for AI Agents

### Critical Distinction: Project Management vs Project Documentation

| Term | Means | Sources |
|------|-------|---------|
| **"project docs"** / **"project documentation"** | Application documentation (HOW the system works) | \`docs/\` + \`DECISIONS.md\` |
| **"project status"** / **"todos"** / **"roadmap"** | Project management (WHAT we're doing) | \`.project/\` management files |

**DECISIONS.md is special**: It's application documentation (explains WHY decisions were made) even though it lives in \`.project/\`.

## Source Mappings

### "project docs" / "project documents" / "project documentation"
APPLICATION documentation — how the system works, why it was built this way.
Searches: \`docs/\` + \`DECISIONS.md\`

### "docs" / "documentation" / "reference"
Reference documentation only.
Searches: \`docs/\` only

### "plan" / "todos" / "roadmap" / "status" / "backlog"
Project MANAGEMENT — tracking work, not documenting the system.
Searches: \`.project/\` (excluding DECISIONS.md)

### "project" / "the project"
Everything (when intent is ambiguous).
Searches: \`.project/\` + root files + \`docs/\`

## File Structure

| File | Type | Purpose |
|------|------|---------|
| \`index.md\` | Contract | This file - source mappings |
| \`DECISIONS.md\` | **Documentation** | Architecture decisions (WHY) |
| \`BACKLOG.md\` | Management | Prioritized work queue |
| \`TODO.md\` | Management | Task dashboard |
| \`ROADMAP.md\` | Management | Project phases/milestones |
| \`STATUS.md\` | Management | Project health/progress |
| \`todos/\` | Management | Active task files |
| \`archive/\` | Management | Completed tasks |

## Principles

- **"Project docs" ≠ "Project management"** — Users saying "update project docs" want application documentation updated, not task tracking
- **DECISIONS.md is documentation** — It explains the system, not tracks work
- **Natural language stays natural** — "Project docs" maps to docs/ + DECISIONS.md
- **Agents don't guess** — Explicit mappings defined here

---
*Last Updated: ${date}*
`,

		'ROADMAP.md': `---
title: ${project_name} - Roadmap
created: ${getISODate()}
updated: ${getISODate()}
---

# Roadmap

## Overview

${project_description || 'Project roadmap and milestones.'}

## Phases

### Phase 1: Foundation
**Status:** Not Started
**Target:** TBD

- [ ] Initial setup
- [ ] Core infrastructure
- [ ] Basic functionality

### Phase 2: Core Features
**Status:** Not Started
**Target:** TBD

- [ ] Feature development
- [ ] Testing
- [ ] Documentation

### Phase 3: Polish & Launch
**Status:** Not Started
**Target:** TBD

- [ ] Bug fixes
- [ ] Performance optimization
- [ ] Launch preparation

## Milestones

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| MVP | TBD | Not Started |
| Beta | TBD | Not Started |
| v1.0 | TBD | Not Started |

## Future Considerations

- Future feature ideas
- Technical debt items
- Nice-to-have improvements

---
*Last Updated: ${date}*
`,

		'STATUS.md': `---
title: ${project_name} - Status
created: ${getISODate()}
updated: ${getISODate()}
---

# Project Status

**Last Updated:** ${date}

## Current Phase

**Foundation** — Initial setup and planning

## Health

🟡 **Yellow** — Project initialized, work not yet started

## Progress

| Area | Status | Notes |
|------|--------|-------|
| Planning | 🟢 In Progress | Setting up project structure |
| Development | ⚪ Not Started | |
| Testing | ⚪ Not Started | |
| Documentation | 🟢 In Progress | Initial docs created |

## Recent Changes

- ✅ Initialized project structure
- ✅ Created standard documentation files
- 📋 Ready for planning phase

## Active Work

None yet — see TODO.md for task dashboard

## Blockers

None currently

## Next Steps

1. Define project requirements
2. Create initial tasks using \`create_task\`
3. Begin Phase 1 development

---
*Last Updated: ${date}*
`,

		'DECISIONS.md': `---
title: ${project_name} - Architecture Decisions
created: ${getISODate()}
updated: ${getISODate()}
---

# Architecture Decisions

This document records architecture decisions, trade-offs, and rationale for ${project_name}.

## Decision Log

### ADR-001: Project Structure
**Date:** ${date}
**Status:** Accepted

**Context:**
Need a standard way to organize project documentation and tasks.

**Decision:**
Use \`.project/\` directory with:
- YAML frontmatter for task metadata
- Jira-like task IDs ({PROJECT}-{NNN})
- Dependency tracking between tasks

**Consequences:**
- Consistent structure across projects
- Machine-readable task metadata
- Clear separation of operational vs reference docs

---

## Template for New Decisions

\`\`\`markdown
### ADR-XXX: Title
**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded

**Context:**
What is the issue that we're seeing that is motivating this decision?

**Decision:**
What is the change that we're proposing and/or doing?

**Consequences:**
What becomes easier or more difficult to do because of this change?
\`\`\`

---
*Last Updated: ${date}*
`,

		'TODO.md': `---
title: ${project_name} - Task Dashboard
created: ${getISODate()}
updated: ${getISODate()}
---

# TODO Dashboard

**Last Updated:** ${date}

## Overview

| Status | Count |
|--------|-------|
| 🔵 In Progress | 0 |
| ⚪ Todo | 0 |
| 🔴 Blocked | 0 |
| ✅ Done | 0 |

## 🎯 Next Up (Active Tasks)

*No active tasks. Promote tasks from BACKLOG.md using \`promote_task\`.*

## Workflow

\`\`\`
ROADMAP.md → import_tasks → BACKLOG.md → promote_task → todos/*.md → archive_task → archive/
   (plan)      (extract)      (queue)      (activate)    (work)      (complete)    (history)
\`\`\`

1. **Plan:** Define phases in ROADMAP.md
2. **Import:** Use \`import_tasks\` to populate BACKLOG.md
3. **Promote:** Use \`promote_task\` to activate work (creates YAML file)
4. **Work:** Use \`get_next_task\` to see what to do, \`update_task\` to track
5. **Complete:** Use \`archive_task\` to move done items to archive

---
*This file is auto-generated by \`sync_todo_index\`. Active tasks are in \`.project/todos/\`.*
`,

		'BACKLOG.md': `---
title: ${project_name} - Backlog
created: ${getISODate()}
updated: ${getISODate()}
---

# Backlog

**Last Updated:** ${date}

This is the prioritized queue of future work. Items here are **planned but not yet active**.

## How to Use

1. **Add items:** Use \`import_tasks\` to import from ROADMAP.md or add manually
2. **Promote to active:** Use \`promote_task\` when ready to start work
3. **Keep it prioritized:** P0 items at top, P3 at bottom

## Queue

### P0 - Critical
*No critical items*

### P1 - High Priority
*No high priority items*

### P2 - Medium Priority
*No medium priority items*

### P3 - Low Priority
*No low priority items*

---

## Item Format

Each backlog item should follow this format:

\`\`\`markdown
- [ ] **{ID}**: {Title} [P{0-3}] [{tags}]
  {Optional description}
\`\`\`

Example:
\`\`\`markdown
- [ ] **AUTH-001**: Implement user login [P1] [security]
  Basic username/password authentication
\`\`\`

---
*Use \`promote_task\` to move items to active work in todos/*
`,
	};

	// Create each file
	for (const [filename, content] of Object.entries(templates)) {
		const filePath = join(PROJECT_DIR, filename);
		const exists = await fileExists(filePath);

		if (exists && !overwrite) {
			skipped.push(filename);
			continue;
		}

		await writeFile(filePath, content, 'utf-8');
		files.push({ file: filename, action: exists ? 'overwritten' : 'created' });
	}

	// Create .gitkeep in todos/ if empty
	const todosGitkeep = join(TODOS_DIR, '.gitkeep');
	if (!(await fileExists(todosGitkeep))) {
		await writeFile(todosGitkeep, '', 'utf-8');
	}

	// Create .gitkeep in archive/
	const archiveGitkeep = join(ARCHIVE_DIR, '.gitkeep');
	if (!(await fileExists(archiveGitkeep))) {
		await writeFile(archiveGitkeep, '', 'utf-8');
	}

	let result = `## Project Initialized: ${project_name}\n\n`;
	result += `**Location:** \`.project/\`\n\n`;

	if (files.length > 0) {
		result += `### Files Created\n\n`;
		for (const f of files) {
			result += `- ✅ \`${f.file}\` (${f.action})\n`;
		}
		result += `- ✅ \`todos/\` directory (active work)\n`;
		result += `- ✅ \`archive/\` directory (completed work)\n\n`;
	}

	if (skipped.length > 0) {
		result += `### Files Skipped (already exist)\n\n`;
		for (const f of skipped) {
			result += `- ⏭️ \`${f}\`\n`;
		}
		result += `\n*Use \`overwrite: true\` to replace existing files.*\n\n`;
	}

	result += `### Next Steps\n\n`;
	result += `1. Review and customize \`.project/ROADMAP.md\`\n`;
	result += `2. Create tasks with \`create_task\`\n`;
	result += `3. Import tasks from roadmap with \`import_tasks\`\n`;
	result += `4. Run \`lint_project_docs\` to validate structure\n`;

	return {
		content: [{ type: 'text', text: result }],
	};
}

/**
 * Handler map
 */
export const handlers = {
	lint_project_docs: lintProjectDocs,
	init_project: initProject,
};
