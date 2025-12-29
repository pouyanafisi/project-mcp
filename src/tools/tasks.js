/**
 * Task management tools.
 * Handles: create_task, update_task, get_next_task, list_tasks, sync_todo_index
 */

import {
	TODOS_DIR,
	PROJECT_DIR,
	STATUS_ORDER,
	PRIORITY_ORDER,
	STATUS_EMOJI,
} from '../lib/constants.js';
import {
	readFile,
	writeFile,
	join,
	ensureTodosDir,
	ensureProjectDir,
	fileExists,
	matter,
} from '../lib/files.js';
import { getCurrentDate, getISODate } from '../lib/dates.js';
import {
	loadAllTasks,
	getNextTaskId,
	areDependenciesMet,
	sortTasksByPriority,
} from '../lib/tasks.js';

/**
 * Tool definitions
 */
export const definitions = [
	{
		name: 'create_task',
		description:
			'Creates a new task with YAML frontmatter metadata. Uses Jira-like IDs (e.g., AUTH-001, API-042) for stable references. Supports dependencies, priorities, estimates, due dates, and tags. Agents can determine execution order by checking dependencies and priorities.',
		inputSchema: {
			type: 'object',
			properties: {
				title: {
					type: 'string',
					description:
						'The title of the task (e.g., "Implement OAuth authentication", "Fix login bug").',
				},
				project: {
					type: 'string',
					description:
						'Project/Epic identifier used in the task ID (e.g., "AUTH", "API", "FRONTEND"). Will be uppercased. The task ID will be {PROJECT}-{NNN}.',
				},
				description: {
					type: 'string',
					description: 'Detailed description of the task. Can include markdown formatting.',
				},
				owner: {
					type: 'string',
					description: 'Who is responsible for this task (e.g., "cursor", "john-doe", "backend-team").',
				},
				priority: {
					type: 'string',
					description:
						'Priority level: "P0" (critical/blocker), "P1" (high), "P2" (medium/default), "P3" (low).',
					enum: ['P0', 'P1', 'P2', 'P3'],
					default: 'P2',
				},
				status: {
					type: 'string',
					description:
						'Current status: "todo" (not started), "in_progress" (being worked on), "blocked" (waiting on something), "review" (needs review), "done" (completed).',
					enum: ['todo', 'in_progress', 'blocked', 'review', 'done'],
					default: 'todo',
				},
				depends_on: {
					type: 'array',
					items: { type: 'string' },
					description:
						'Array of task IDs this task depends on (e.g., ["AUTH-001", "AUTH-002"]). Task cannot start until dependencies are done.',
				},
				blocked_by: {
					type: 'array',
					items: { type: 'string' },
					description:
						'Array of task IDs or external blockers (e.g., ["AUTH-003", "waiting-on-api-key"]). Different from depends_on - these are blockers that prevent progress.',
				},
				estimate: {
					type: 'string',
					description: 'Time estimate (e.g., "2h", "1d", "3d", "1w"). Use h=hours, d=days, w=weeks.',
				},
				due: {
					type: 'string',
					description: 'Due date in YYYY-MM-DD format (e.g., "2025-01-15").',
				},
				tags: {
					type: 'array',
					items: { type: 'string' },
					description:
						'Array of tags for categorization (e.g., ["security", "urgent", "tech-debt", "feature"]).',
				},
				subtasks: {
					type: 'array',
					items: { type: 'string' },
					description: 'Array of subtask descriptions. Will be rendered as a checklist in the task.',
				},
			},
			required: ['title', 'project'],
		},
	},
	{
		name: 'update_task',
		description:
			'Updates an existing task by ID. Can update any field including status, priority, owner, dependencies, etc. Use this to transition tasks through workflow states.',
		inputSchema: {
			type: 'object',
			properties: {
				id: {
					type: 'string',
					description: 'The task ID to update (e.g., "AUTH-001").',
				},
				title: {
					type: 'string',
					description: 'New title for the task.',
				},
				description: {
					type: 'string',
					description: 'New description. Use "append:TEXT" to append to existing description.',
				},
				owner: {
					type: 'string',
					description: 'New owner for the task.',
				},
				priority: {
					type: 'string',
					description: 'New priority level.',
					enum: ['P0', 'P1', 'P2', 'P3'],
				},
				status: {
					type: 'string',
					description: 'New status. Transitioning to "done" will set completed date.',
					enum: ['todo', 'in_progress', 'blocked', 'review', 'done'],
				},
				depends_on: {
					type: 'array',
					items: { type: 'string' },
					description: 'New dependency list. Use "add:ID" or "remove:ID" to modify existing.',
				},
				blocked_by: {
					type: 'array',
					items: { type: 'string' },
					description: 'New blocked_by list.',
				},
				estimate: {
					type: 'string',
					description: 'New time estimate.',
				},
				due: {
					type: 'string',
					description: 'New due date (YYYY-MM-DD).',
				},
				tags: {
					type: 'array',
					items: { type: 'string' },
					description: 'New tags list. Use "add:TAG" or "remove:TAG" to modify existing.',
				},
				add_subtask: {
					type: 'string',
					description: 'Add a new subtask to the task.',
				},
				complete_subtask: {
					type: 'string',
					description: 'Mark a subtask as complete (partial match on subtask text).',
				},
			},
			required: ['id'],
		},
	},
	{
		name: 'get_next_task',
		description:
			'Returns the next task(s) that should be worked on. Considers: dependencies (only returns tasks whose dependencies are done), priority (P0 first), status (excludes done/blocked), and optionally filters by owner or project. This is the key tool for agentic execution - call this to know what to do next.',
		inputSchema: {
			type: 'object',
			properties: {
				owner: {
					type: 'string',
					description: 'Filter by owner. Only return tasks assigned to this owner.',
				},
				project: {
					type: 'string',
					description: 'Filter by project. Only return tasks from this project.',
				},
				include_blocked: {
					type: 'boolean',
					description: 'Include blocked tasks in results. Default: false.',
					default: false,
				},
				limit: {
					type: 'number',
					description: 'Maximum number of tasks to return. Default: 5.',
					default: 5,
				},
			},
		},
	},
	{
		name: 'list_tasks',
		description:
			'Lists all tasks with optional filtering. Returns a summary view of tasks organized by status and priority.',
		inputSchema: {
			type: 'object',
			properties: {
				project: {
					type: 'string',
					description: 'Filter by project.',
				},
				owner: {
					type: 'string',
					description: 'Filter by owner.',
				},
				status: {
					type: 'string',
					description: 'Filter by status.',
					enum: ['todo', 'in_progress', 'blocked', 'review', 'done', ''],
				},
				priority: {
					type: 'string',
					description: 'Filter by priority.',
					enum: ['P0', 'P1', 'P2', 'P3', ''],
				},
				tag: {
					type: 'string',
					description: 'Filter by tag.',
				},
			},
		},
	},
	{
		name: 'sync_todo_index',
		description:
			"Syncs the parent TODO.md file with all tasks. Generates a dashboard view with tasks organized by status, priority counts, dependency graph, and execution order. This provides a bird's eye view of all work.",
		inputSchema: {
			type: 'object',
			properties: {
				format: {
					type: 'string',
					description:
						'Output format: "dashboard" (default, visual overview), "table" (compact table), "kanban" (by status columns).',
					enum: ['dashboard', 'table', 'kanban'],
					default: 'dashboard',
				},
			},
		},
	},
];

/**
 * Create task handler
 */
async function createTask(args) {
	const {
		title,
		project,
		description = '',
		owner = 'unassigned',
		priority = 'P2',
		status = 'todo',
		depends_on = [],
		blocked_by = [],
		estimate,
		due,
		tags = [],
		subtasks = [],
	} = args;

	await ensureTodosDir();

	// Generate task ID
	const id = await getNextTaskId(project);
	const filename = `${id}.md`;
	const filePath = join(TODOS_DIR, filename);

	// Build frontmatter
	const frontmatter = {
		id,
		title,
		project: project.toUpperCase(),
		priority,
		status,
		owner,
		depends_on,
		blocked_by,
		tags,
		created: getISODate(),
		updated: getISODate(),
	};
	if (estimate) frontmatter.estimate = estimate;
	if (due) frontmatter.due = due;

	// Build content
	let content = `# ${id}: ${title}\n\n`;
	if (description) {
		content += `## Description\n\n${description}\n\n`;
	}
	if (subtasks.length > 0) {
		content += `## Subtasks\n\n`;
		for (const subtask of subtasks) {
			content += `- [ ] ${subtask}\n`;
		}
		content += '\n';
	}
	content += `## Notes\n\n`;

	// Write file with frontmatter
	const fileContent = matter.stringify(content, frontmatter);
	await writeFile(filePath, fileContent, 'utf-8');

	return {
		content: [
			{
				type: 'text',
				text: `✅ Created task **${id}**: ${title}\n\n**File:** \`todos/${filename}\`\n**Project:** ${project.toUpperCase()}\n**Priority:** ${priority}\n**Status:** ${status}\n**Owner:** ${owner}\n${depends_on.length > 0 ? `**Depends on:** ${depends_on.join(', ')}\n` : ''}${estimate ? `**Estimate:** ${estimate}\n` : ''}${due ? `**Due:** ${due}\n` : ''}${tags.length > 0 ? `**Tags:** ${tags.join(', ')}\n` : ''}\n\nUse \`update_task\` to modify this task or \`get_next_task\` to find what to work on next.`,
			},
		],
	};
}

/**
 * Update task handler
 */
async function updateTask(args) {
	const { id, ...updates } = args;
	await ensureTodosDir();

	const filename = `${id.toUpperCase()}.md`;
	const filePath = join(TODOS_DIR, filename);

	if (!(await fileExists(filePath))) {
		return {
			content: [{ type: 'text', text: `❌ Task not found: ${id}` }],
			isError: true,
		};
	}

	const fileContent = await readFile(filePath, 'utf-8');
	const parsed = matter(fileContent);
	const data = parsed.data;
	let content = parsed.content;

	// Apply updates to frontmatter
	const changes = [];
	if (updates.title !== undefined) {
		data.title = updates.title;
		changes.push(`title → "${updates.title}"`);
	}
	if (updates.owner !== undefined) {
		data.owner = updates.owner;
		changes.push(`owner → ${updates.owner}`);
	}
	if (updates.priority !== undefined) {
		data.priority = updates.priority;
		changes.push(`priority → ${updates.priority}`);
	}
	if (updates.status !== undefined) {
		const oldStatus = data.status;
		data.status = updates.status;
		changes.push(`status → ${updates.status}`);
		if (updates.status === 'done' && oldStatus !== 'done') {
			data.completed = getISODate();
			changes.push(`completed → ${data.completed}`);
		}
	}
	if (updates.estimate !== undefined) {
		data.estimate = updates.estimate;
		changes.push(`estimate → ${updates.estimate}`);
	}
	if (updates.due !== undefined) {
		data.due = updates.due;
		changes.push(`due → ${updates.due}`);
	}
	if (updates.depends_on !== undefined) {
		data.depends_on = updates.depends_on;
		changes.push(`depends_on → [${updates.depends_on.join(', ')}]`);
	}
	if (updates.blocked_by !== undefined) {
		data.blocked_by = updates.blocked_by;
		changes.push(`blocked_by → [${updates.blocked_by.join(', ')}]`);
	}
	if (updates.tags !== undefined) {
		data.tags = updates.tags;
		changes.push(`tags → [${updates.tags.join(', ')}]`);
	}

	// Handle description update
	if (updates.description !== undefined) {
		if (updates.description.startsWith('append:')) {
			const toAppend = updates.description.substring(7);
			const descSection = content.match(/## Description\n\n([\s\S]*?)(?=\n## |$)/);
			if (descSection) {
				content = content.replace(
					/## Description\n\n([\s\S]*?)(?=\n## |$)/,
					`## Description\n\n${descSection[1].trim()}\n\n${toAppend}\n\n`
				);
			}
			changes.push('description appended');
		} else {
			content = content.replace(
				/## Description\n\n[\s\S]*?(?=\n## |$)/,
				`## Description\n\n${updates.description}\n\n`
			);
			changes.push('description updated');
		}
	}

	// Handle subtask operations
	if (updates.add_subtask) {
		const subtaskSection = content.match(/## Subtasks\n\n([\s\S]*?)(?=\n## |$)/);
		if (subtaskSection) {
			content = content.replace(
				/## Subtasks\n\n([\s\S]*?)(?=\n## |$)/,
				`## Subtasks\n\n${subtaskSection[1].trim()}\n- [ ] ${updates.add_subtask}\n\n`
			);
		} else {
			content = content.replace(/## Notes/, `## Subtasks\n\n- [ ] ${updates.add_subtask}\n\n## Notes`);
		}
		changes.push(`added subtask: ${updates.add_subtask}`);
	}

	if (updates.complete_subtask) {
		const regex = new RegExp(
			`- \\[ \\] (.*${updates.complete_subtask.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*)`
		);
		if (regex.test(content)) {
			content = content.replace(regex, '- [x] $1');
			changes.push(`completed subtask: ${updates.complete_subtask}`);
		}
	}

	// Update timestamp
	data.updated = getISODate();

	// Write updated file
	const newFileContent = matter.stringify(content, data);
	await writeFile(filePath, newFileContent, 'utf-8');

	return {
		content: [
			{
				type: 'text',
				text: `✅ Updated task **${id}**\n\n**Changes:**\n${changes.map((c) => `- ${c}`).join('\n')}\n\n**Current state:**\n- Priority: ${data.priority}\n- Status: ${data.status}\n- Owner: ${data.owner}`,
			},
		],
	};
}

/**
 * Get next task handler
 */
async function getNextTask(args) {
	const { owner, project, include_blocked = false, limit = 5 } = args || {};

	const allTasks = await loadAllTasks();

	// Filter tasks
	let candidates = allTasks.filter((task) => {
		if (task.status === 'done') return false;
		if (!include_blocked && task.status === 'blocked') return false;
		if (owner && task.owner !== owner) return false;
		if (project && task.project !== project.toUpperCase()) return false;
		if (!areDependenciesMet(task, allTasks)) return false;
		return true;
	});

	// Sort by priority
	candidates = sortTasksByPriority(candidates).slice(0, limit);

	if (candidates.length === 0) {
		return {
			content: [
				{
					type: 'text',
					text: `✅ **No tasks available!**\n\nAll tasks are either:\n- Completed\n- Blocked\n- Waiting on dependencies\n\nUse \`list_tasks\` to see all tasks or \`create_task\` to add new ones.`,
				},
			],
		};
	}

	let result = `## Next Tasks to Work On\n\n`;
	result += `*Sorted by: in-progress first, then priority (P0→P3), then due date*\n\n`;

	for (const task of candidates) {
		result += `### ${task.priority ? `[${task.priority}] ` : ''}${task.id}: ${task.title}\n\n`;
		result += `**Status:** ${task.status} | **Owner:** ${task.owner}\n`;
		if (task.estimate) result += `**Estimate:** ${task.estimate} | `;
		if (task.due) result += `**Due:** ${task.due}\n`;
		if (task.depends_on?.length > 0) {
			result += `**Depends on:** ${task.depends_on.join(', ')} ✅ (all done)\n`;
		}
		if (task.tags?.length > 0) {
			result += `**Tags:** ${task.tags.join(', ')}\n`;
		}
		result += `**File:** \`${task.path}\`\n\n`;
	}

	result += `---\n\n**Tip:** Use \`update_task\` with \`status: "in_progress"\` to start working on a task.`;

	return {
		content: [{ type: 'text', text: result }],
	};
}

/**
 * List tasks handler
 */
async function listTasks(args) {
	const { project, owner, status, priority, tag } = args || {};

	const allTasks = await loadAllTasks();

	// Apply filters
	let tasks = allTasks.filter((task) => {
		if (project && task.project !== project.toUpperCase()) return false;
		if (owner && task.owner !== owner) return false;
		if (status && task.status !== status) return false;
		if (priority && task.priority !== priority) return false;
		if (tag && (!task.tags || !task.tags.includes(tag))) return false;
		return true;
	});

	// Sort by status, priority, ID
	tasks.sort((a, b) => {
		const aStatus = STATUS_ORDER[a.status] ?? 5;
		const bStatus = STATUS_ORDER[b.status] ?? 5;
		if (aStatus !== bStatus) return aStatus - bStatus;
		const aPri = PRIORITY_ORDER[a.priority] ?? 2;
		const bPri = PRIORITY_ORDER[b.priority] ?? 2;
		if (aPri !== bPri) return aPri - bPri;
		return a.id.localeCompare(b.id);
	});

	// Build summary
	const counts = {
		todo: tasks.filter((t) => t.status === 'todo').length,
		in_progress: tasks.filter((t) => t.status === 'in_progress').length,
		blocked: tasks.filter((t) => t.status === 'blocked').length,
		review: tasks.filter((t) => t.status === 'review').length,
		done: tasks.filter((t) => t.status === 'done').length,
	};

	let result = `## Task List\n\n`;
	result += `**Total:** ${tasks.length} tasks | `;
	result += `🔵 In Progress: ${counts.in_progress} | `;
	result += `⚪ Todo: ${counts.todo} | `;
	result += `🔴 Blocked: ${counts.blocked} | `;
	result += `🟡 Review: ${counts.review} | `;
	result += `✅ Done: ${counts.done}\n\n`;

	for (const s of ['in_progress', 'todo', 'blocked', 'review', 'done']) {
		const statusTasks = tasks.filter((t) => t.status === s);
		if (statusTasks.length > 0) {
			result += `### ${STATUS_EMOJI[s]} ${s.replace('_', ' ').toUpperCase()} (${statusTasks.length})\n\n`;
			result += `| ID | P | Title | Owner | Due |\n`;
			result += `|----|---|-------|-------|-----|\n`;
			for (const task of statusTasks) {
				result += `| ${task.id} | ${task.priority} | ${task.title.substring(0, 40)}${task.title.length > 40 ? '...' : ''} | ${task.owner} | ${task.due || '-'} |\n`;
			}
			result += '\n';
		}
	}

	return {
		content: [{ type: 'text', text: result }],
	};
}

/**
 * Sync todo index handler
 */
async function syncTodoIndex(args) {
	const { format = 'dashboard' } = args || {};
	await ensureProjectDir();

	const tasks = await loadAllTasks();
	const todoPath = join(PROJECT_DIR, 'TODO.md');

	// Calculate stats
	const counts = {
		total: tasks.length,
		todo: tasks.filter((t) => t.status === 'todo').length,
		in_progress: tasks.filter((t) => t.status === 'in_progress').length,
		blocked: tasks.filter((t) => t.status === 'blocked').length,
		review: tasks.filter((t) => t.status === 'review').length,
		done: tasks.filter((t) => t.status === 'done').length,
	};

	const priorityCounts = {
		P0: tasks.filter((t) => t.priority === 'P0' && t.status !== 'done').length,
		P1: tasks.filter((t) => t.priority === 'P1' && t.status !== 'done').length,
		P2: tasks.filter((t) => t.priority === 'P2' && t.status !== 'done').length,
		P3: tasks.filter((t) => t.priority === 'P3' && t.status !== 'done').length,
	};

	// Find next actionable tasks
	const actionable = sortTasksByPriority(
		tasks.filter((t) => t.status !== 'done' && t.status !== 'blocked' && areDependenciesMet(t, tasks))
	).slice(0, 5);

	let content = `# TODO Dashboard

**Last Updated:** ${getCurrentDate()}

## Overview

| Status | Count | | Priority | Active |
|--------|-------|-|----------|--------|
| 🔵 In Progress | ${counts.in_progress} | | 🔴 P0 (Critical) | ${priorityCounts.P0} |
| ⚪ Todo | ${counts.todo} | | 🟠 P1 (High) | ${priorityCounts.P1} |
| 🔴 Blocked | ${counts.blocked} | | 🟡 P2 (Medium) | ${priorityCounts.P2} |
| 🟡 Review | ${counts.review} | | 🟢 P3 (Low) | ${priorityCounts.P3} |
| ✅ Done | ${counts.done} | | | |
| **Total** | **${counts.total}** | | **Active** | **${counts.total - counts.done}** |

## 🎯 Next Up (Dependency-Ready)

`;

	if (actionable.length > 0) {
		content += `| Priority | ID | Title | Owner | Status |\n`;
		content += `|----------|-------|-------|-------|--------|\n`;
		for (const task of actionable) {
			content += `| ${task.priority} | [${task.id}](todos/${task.id}.md) | ${task.title.substring(0, 35)}${task.title.length > 35 ? '...' : ''} | ${task.owner} | ${task.status} |\n`;
		}
	} else {
		content += `*No actionable tasks available. All tasks are either done, blocked, or waiting on dependencies.*\n`;
	}

	// In Progress section
	const inProgress = tasks.filter((t) => t.status === 'in_progress');
	content += `\n## 🔵 In Progress (${inProgress.length})\n\n`;
	if (inProgress.length > 0) {
		for (const task of inProgress) {
			content += `- **[${task.id}](todos/${task.id}.md)** ${task.title} — *${task.owner}*\n`;
		}
	} else {
		content += `*No tasks in progress.*\n`;
	}

	// Blocked section
	const blocked = tasks.filter((t) => t.status === 'blocked');
	if (blocked.length > 0) {
		content += `\n## 🔴 Blocked (${blocked.length})\n\n`;
		for (const task of blocked) {
			const blockers = task.blocked_by?.length > 0 ? `Blocked by: ${task.blocked_by.join(', ')}` : '';
			content += `- **[${task.id}](todos/${task.id}.md)** ${task.title} ${blockers}\n`;
		}
	}

	// Projects summary
	const projects = [...new Set(tasks.map((t) => t.project))];
	if (projects.length > 0) {
		content += `\n## 📁 Projects\n\n`;
		for (const proj of projects) {
			const projTasks = tasks.filter((t) => t.project === proj);
			const projDone = projTasks.filter((t) => t.status === 'done').length;
			content += `- **${proj}**: ${projDone}/${projTasks.length} done\n`;
		}
	}

	content += `\n---\n\n*This file is auto-generated by \`sync_todo_index\`. Tasks are managed in \`.project/todos/\` with YAML frontmatter.*\n`;
	content += `\n**Tools:** \`create_task\` | \`update_task\` | \`get_next_task\` | \`list_tasks\`\n`;

	await writeFile(todoPath, content, 'utf-8');

	return {
		content: [
			{
				type: 'text',
				text: `✅ Synced TODO.md dashboard\n\n**Summary:**\n- Total: ${counts.total} tasks\n- Active: ${counts.total - counts.done}\n- In Progress: ${counts.in_progress}\n- Blocked: ${counts.blocked}\n- Done: ${counts.done}\n\n**Next actionable:** ${actionable.length > 0 ? actionable.map((t) => t.id).join(', ') : 'None'}`,
			},
		],
	};
}

/**
 * Handler map
 */
export const handlers = {
	create_task: createTask,
	update_task: updateTask,
	get_next_task: getNextTask,
	list_tasks: listTasks,
	sync_todo_index: syncTodoIndex,
};
