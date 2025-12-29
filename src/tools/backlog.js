/**
 * Backlog management tools.
 * Handles: import_tasks, promote_task, archive_task, add_to_backlog, get_backlog, update_backlog_item, remove_from_backlog
 */

import {
	PROJECT_ROOT,
	PROJECT_DIR,
	TODOS_DIR,
	ARCHIVE_DIR,
	BACKLOG_FILE,
} from '../lib/constants.js';
import {
	readFile,
	writeFile,
	unlink,
	join,
	ensureProjectDir,
	ensureTodosDir,
	ensureArchiveDir,
	fileExists,
	matter,
} from '../lib/files.js';
import { getCurrentDate, getISODate } from '../lib/dates.js';
import { getExistingTaskIds, parseTasksFromContent } from '../lib/tasks.js';

/**
 * Tool definitions
 */
export const definitions = [
	{
		name: 'import_tasks',
		description:
			'Parses a plan document and imports tasks to BACKLOG.md (not individual files). Use this to populate the backlog from a roadmap or requirements doc. Tasks stay in BACKLOG until promoted to active work via promote_task.',
		inputSchema: {
			type: 'object',
			properties: {
				source: {
					type: 'string',
					description:
						'Path to the source file to parse (e.g., "ROADMAP.md", ".project/ROADMAP.md"). Can also be raw markdown content if source_type is "content".',
				},
				source_type: {
					type: 'string',
					description:
						'Type of source: "file" (path to file) or "content" (raw markdown). Default: "file".',
					enum: ['file', 'content'],
					default: 'file',
				},
				project: {
					type: 'string',
					description: 'Project prefix for task IDs (e.g., "AUTH", "API"). Required.',
				},
				phase: {
					type: 'string',
					description: 'Optional: Only import tasks from a specific phase/section.',
				},
				default_priority: {
					type: 'string',
					description: 'Default priority for tasks. Default: "P2".',
					enum: ['P0', 'P1', 'P2', 'P3'],
					default: 'P2',
				},
				dry_run: {
					type: 'boolean',
					description:
						'If true, shows what would be imported without modifying BACKLOG.md. Default: false.',
					default: false,
				},
			},
			required: ['source', 'project'],
		},
	},
	{
		name: 'promote_task',
		description:
			'Promotes a task from BACKLOG.md to an active YAML task file in todos/. Use this when starting work on a backlog item. Creates a full task file with YAML frontmatter, dependencies, and metadata.',
		inputSchema: {
			type: 'object',
			properties: {
				task_id: {
					type: 'string',
					description: 'The task ID to promote from backlog (e.g., "AUTH-001").',
				},
				owner: {
					type: 'string',
					description: 'Who will work on this task. Default: "unassigned".',
					default: 'unassigned',
				},
				priority: {
					type: 'string',
					description: 'Priority override. If not set, uses priority from backlog.',
					enum: ['P0', 'P1', 'P2', 'P3', ''],
				},
				depends_on: {
					type: 'array',
					items: { type: 'string' },
					description:
						'Task IDs this depends on (e.g., ["AUTH-002"]). Only active tasks can be dependencies.',
				},
				estimate: {
					type: 'string',
					description: 'Time estimate (e.g., "2h", "1d", "3d").',
				},
				due: {
					type: 'string',
					description: 'Due date in YYYY-MM-DD format.',
				},
			},
			required: ['task_id'],
		},
	},
	{
		name: 'archive_task',
		description:
			'Archives a completed task by moving it from todos/ to archive/. Keeps the active task queue small and focused. Archived tasks are preserved for history but excluded from get_next_task.',
		inputSchema: {
			type: 'object',
			properties: {
				task_id: {
					type: 'string',
					description: 'The task ID to archive (e.g., "AUTH-001"). Must have status "done".',
				},
				force: {
					type: 'boolean',
					description: 'Archive even if not marked done. Default: false.',
					default: false,
				},
			},
			required: ['task_id'],
		},
	},
	{
		name: 'add_to_backlog',
		description:
			'Adds a single item to BACKLOG.md. Use this for quick task creation without bulk import. Items are added to the specified priority section and can later be promoted to active work.',
		inputSchema: {
			type: 'object',
			properties: {
				title: {
					type: 'string',
					description: 'The task title/description.',
				},
				project: {
					type: 'string',
					description: 'Project prefix for the task ID (e.g., "AUTH", "API").',
				},
				priority: {
					type: 'string',
					description: 'Priority level. Default: "P2".',
					enum: ['P0', 'P1', 'P2', 'P3'],
					default: 'P2',
				},
				tags: {
					type: 'array',
					items: { type: 'string' },
					description: 'Optional tags for categorization.',
				},
				phase: {
					type: 'string',
					description: 'Optional phase/milestone this task belongs to.',
				},
				subtasks: {
					type: 'array',
					items: { type: 'string' },
					description: 'Optional subtasks to include.',
				},
			},
			required: ['title', 'project'],
		},
	},
	{
		name: 'get_backlog',
		description:
			'Reads and returns the current backlog contents with optional filtering. Shows tasks organized by priority with counts and summary.',
		inputSchema: {
			type: 'object',
			properties: {
				priority: {
					type: 'string',
					description: 'Filter by priority level.',
					enum: ['P0', 'P1', 'P2', 'P3', ''],
				},
				project: {
					type: 'string',
					description: 'Filter by project prefix.',
				},
				include_promoted: {
					type: 'boolean',
					description: 'Include already-promoted items. Default: false.',
					default: false,
				},
			},
		},
	},
	{
		name: 'update_backlog_item',
		description:
			'Updates an item in BACKLOG.md. Can change priority, title, tags, or phase without promoting to active work.',
		inputSchema: {
			type: 'object',
			properties: {
				task_id: {
					type: 'string',
					description: 'The task ID to update (e.g., "AUTH-001").',
				},
				title: {
					type: 'string',
					description: 'New title for the task.',
				},
				priority: {
					type: 'string',
					description: 'New priority level (will move to new section).',
					enum: ['P0', 'P1', 'P2', 'P3'],
				},
				tags: {
					type: 'array',
					items: { type: 'string' },
					description: 'New tags (replaces existing).',
				},
				phase: {
					type: 'string',
					description: 'New phase/milestone.',
				},
			},
			required: ['task_id'],
		},
	},
	{
		name: 'remove_from_backlog',
		description:
			'Removes an item from BACKLOG.md without promoting it. Use for tasks that are no longer needed or were added by mistake.',
		inputSchema: {
			type: 'object',
			properties: {
				task_id: {
					type: 'string',
					description: 'The task ID to remove (e.g., "AUTH-001").',
				},
				reason: {
					type: 'string',
					description: 'Optional reason for removal (for logging).',
				},
			},
			required: ['task_id'],
		},
	},
];

/**
 * Import tasks handler
 */
async function importTasks(args) {
	const {
		source,
		source_type = 'file',
		project,
		phase: filterPhase,
		default_priority = 'P2',
		dry_run = false,
	} = args;

	await ensureProjectDir();

	// Get content
	let content;
	if (source_type === 'file') {
		const locations = [source, join(PROJECT_ROOT, source), join(PROJECT_DIR, source)];
		let found = false;
		for (const loc of locations) {
			if (await fileExists(loc)) {
				content = await readFile(loc, 'utf-8');
				found = true;
				break;
			}
		}
		if (!found) {
			return {
				content: [{ type: 'text', text: `❌ File not found: ${source}` }],
				isError: true,
			};
		}
	} else {
		content = source;
	}

	// Parse tasks from content
	let tasks = parseTasksFromContent(content, project.toUpperCase(), default_priority);

	// Filter by phase if specified
	if (filterPhase) {
		tasks = tasks.filter((t) => t.phase && t.phase.toLowerCase().includes(filterPhase.toLowerCase()));
	}

	if (tasks.length === 0) {
		return {
			content: [
				{
					type: 'text',
					text: `⚠️ No tasks found${filterPhase ? ` in phase "${filterPhase}"` : ''}.\n\nThe parser looks for:\n- Markdown lists with \`[ ]\` or \`- \` items\n- Phase/section headers (## or ###)`,
				},
			],
		};
	}

	// Get existing IDs from BACKLOG.md and todos/
	const existingIds = await getExistingTaskIds(project.toUpperCase());

	// Assign sequential IDs
	const projectPrefix = project.toUpperCase();
	let nextNum = 1;
	for (const task of tasks) {
		while (existingIds.has(`${projectPrefix}-${String(nextNum).padStart(3, '0')}`)) {
			nextNum++;
		}
		task.id = `${projectPrefix}-${String(nextNum).padStart(3, '0')}`;
		existingIds.add(task.id);
		nextNum++;
	}

	let result = `## Import to Backlog\n\n`;
	result += `**Source:** ${source_type === 'file' ? source : '(inline content)'}\n`;
	result += `**Project:** ${projectPrefix}\n`;
	result += `**Tasks Found:** ${tasks.length}\n`;
	if (filterPhase) result += `**Phase Filter:** ${filterPhase}\n`;
	result += '\n';

	// Group by priority
	const byPriority = { P0: [], P1: [], P2: [], P3: [] };
	for (const task of tasks) {
		byPriority[task.priority] = byPriority[task.priority] || [];
		byPriority[task.priority].push(task);
	}

	if (dry_run) {
		result += `### Tasks to Import (Dry Run)\n\n`;
		for (const pri of ['P0', 'P1', 'P2', 'P3']) {
			if (byPriority[pri].length > 0) {
				result += `**${pri}** (${byPriority[pri].length})\n`;
				for (const task of byPriority[pri]) {
					result += `- ${task.id}: ${task.title}${task.phase ? ` [${task.phase}]` : ''}\n`;
				}
				result += '\n';
			}
		}
		result += `*Dry run - BACKLOG.md not modified. Run with \`dry_run: false\` to import.*\n`;
	} else {
		// Read or create BACKLOG.md
		let backlogContent;
		if (await fileExists(BACKLOG_FILE)) {
			backlogContent = await readFile(BACKLOG_FILE, 'utf-8');
		} else {
			// Create default backlog structure
			backlogContent = `---
title: Backlog
created: ${getISODate()}
updated: ${getISODate()}
---

# Backlog

**Last Updated:** ${getCurrentDate()}

## Queue

### P0 - Critical

### P1 - High Priority

### P2 - Medium Priority

### P3 - Low Priority

---
*Use \`promote_task\` to move items to active work*
`;
		}

		// Insert tasks into appropriate priority sections
		for (const pri of ['P0', 'P1', 'P2', 'P3']) {
			if (byPriority[pri].length === 0) continue;

			const sectionHeader =
				pri === 'P0'
					? '### P0 - Critical'
					: pri === 'P1'
						? '### P1 - High Priority'
						: pri === 'P2'
							? '### P2 - Medium Priority'
							: '### P3 - Low Priority';

			// Build task entries
			let newItems = '';
			for (const task of byPriority[pri]) {
				const tags = task.tags?.length > 0 ? ` [${task.tags.join(', ')}]` : '';
				const phase = task.phase ? ` (${task.phase})` : '';
				newItems += `- [ ] **${task.id}**: ${task.title}${tags}${phase}\n`;
				if (task.subtasks?.length > 0) {
					for (const sub of task.subtasks) {
						newItems += `  - ${sub}\n`;
					}
				}
			}

			// Insert after section header
			if (backlogContent.includes(sectionHeader)) {
				backlogContent = backlogContent.replace(
					new RegExp(`(${sectionHeader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n)`, 'g'),
					`$1${newItems}\n`
				);
			}
		}

		// Update timestamp
		backlogContent = backlogContent.replace(
			/\*\*Last Updated:\*\* .*/,
			`**Last Updated:** ${getCurrentDate()}`
		);
		backlogContent = backlogContent.replace(/updated: .*/, `updated: ${getISODate()}`);

		await writeFile(BACKLOG_FILE, backlogContent, 'utf-8');

		result += `### Tasks Imported to BACKLOG.md\n\n`;
		for (const pri of ['P0', 'P1', 'P2', 'P3']) {
			if (byPriority[pri].length > 0) {
				result += `**${pri}:** ${byPriority[pri].length} tasks\n`;
			}
		}

		result += `\n✅ **${tasks.length} tasks** added to BACKLOG.md\n\n`;
		result += `### Next Steps\n\n`;
		result += `1. Review BACKLOG.md and adjust priorities\n`;
		result += `2. Use \`promote_task\` to activate items for work\n`;
		result += `3. Active tasks will appear in \`get_next_task\`\n`;
	}

	return {
		content: [{ type: 'text', text: result }],
	};
}

/**
 * Promote task handler
 */
async function promoteTask(args) {
	const { task_id, owner = 'unassigned', priority, depends_on = [], estimate, due } = args;

	await ensureProjectDir();
	await ensureTodosDir();

	const id = task_id.toUpperCase();

	// Check if already active
	const activeFile = join(TODOS_DIR, `${id}.md`);
	if (await fileExists(activeFile)) {
		return {
			content: [{ type: 'text', text: `⚠️ Task ${id} is already active in todos/` }],
		};
	}

	// Find task in BACKLOG.md
	if (!(await fileExists(BACKLOG_FILE))) {
		return {
			content: [{ type: 'text', text: `❌ BACKLOG.md not found. Run \`init_project\` first.` }],
			isError: true,
		};
	}

	let backlog = await readFile(BACKLOG_FILE, 'utf-8');

	// Find the task line
	const taskRegex = new RegExp(
		`^- \\[ \\] \\*\\*${id}\\*\\*:\\s*(.+?)(?:\\s*\\[([^\\]]+)\\])?(?:\\s*\\(([^)]+)\\))?$`,
		'm'
	);
	const match = backlog.match(taskRegex);

	if (!match) {
		return {
			content: [{ type: 'text', text: `❌ Task ${id} not found in BACKLOG.md` }],
			isError: true,
		};
	}

	const title = match[1].trim();
	const tags = match[2] ? match[2].split(',').map((t) => t.trim()) : [];
	const phase = match[3] || null;

	// Detect priority from backlog section
	let taskPriority = priority || 'P2';
	if (!priority) {
		const beforeTask = backlog.substring(0, backlog.indexOf(match[0]));
		if (beforeTask.includes('### P0')) taskPriority = 'P0';
		else if (beforeTask.includes('### P1')) taskPriority = 'P1';
		else if (beforeTask.includes('### P2')) taskPriority = 'P2';
		else if (beforeTask.includes('### P3')) taskPriority = 'P3';
	}

	// Extract project from ID
	const projectMatch = id.match(/^([A-Z]+)-/);
	const project = projectMatch ? projectMatch[1] : 'PROJ';

	// Create YAML task file
	const frontmatter = {
		id,
		title,
		project,
		priority: taskPriority,
		status: 'todo',
		owner,
		depends_on,
		blocked_by: [],
		tags,
		created: getISODate(),
		updated: getISODate(),
	};
	if (estimate) frontmatter.estimate = estimate;
	if (due) frontmatter.due = due;
	if (phase) frontmatter.phase = phase;

	let taskContent = `# ${id}: ${title}\n\n`;
	taskContent += `## Description\n\nPromoted from backlog.\n\n`;
	taskContent += `## Subtasks\n\n`;
	taskContent += `## Notes\n\n`;

	const fileContent = matter.stringify(taskContent, frontmatter);
	await writeFile(activeFile, fileContent, 'utf-8');

	// Mark as promoted in BACKLOG.md (change [ ] to [promoted])
	backlog = backlog.replace(new RegExp(`^(- )\\[ \\]( \\*\\*${id}\\*\\*)`, 'm'), '$1[promoted]$2');

	// Update backlog timestamp
	backlog = backlog.replace(/\*\*Last Updated:\*\* .*/, `**Last Updated:** ${getCurrentDate()}`);

	await writeFile(BACKLOG_FILE, backlog, 'utf-8');

	let result = `## Task Promoted: ${id}\n\n`;
	result += `**Title:** ${title}\n`;
	result += `**Priority:** ${taskPriority}\n`;
	result += `**Owner:** ${owner}\n`;
	result += `**File:** \`todos/${id}.md\`\n\n`;
	if (depends_on.length > 0) result += `**Depends on:** ${depends_on.join(', ')}\n`;
	if (estimate) result += `**Estimate:** ${estimate}\n`;
	if (due) result += `**Due:** ${due}\n`;

	result += `\n✅ Task is now active. Use \`get_next_task\` to see the execution queue.`;

	return {
		content: [{ type: 'text', text: result }],
	};
}

/**
 * Archive task handler
 */
async function archiveTask(args) {
	const { task_id, force = false } = args;

	await ensureArchiveDir();

	const id = task_id.toUpperCase();
	const activeFile = join(TODOS_DIR, `${id}.md`);
	const archiveFile = join(ARCHIVE_DIR, `${id}.md`);

	if (!(await fileExists(activeFile))) {
		return {
			content: [{ type: 'text', text: `❌ Task ${id} not found in todos/` }],
			isError: true,
		};
	}

	// Read task to check status
	const content = await readFile(activeFile, 'utf-8');
	const parsed = matter(content);

	if (parsed.data.status !== 'done' && !force) {
		return {
			content: [
				{
					type: 'text',
					text: `⚠️ Task ${id} is not done (status: ${parsed.data.status}).\n\nUse \`update_task\` to mark it done first, or use \`force: true\` to archive anyway.`,
				},
			],
		};
	}

	// Add archived timestamp
	parsed.data.archived = getISODate();
	parsed.data.updated = getISODate();

	const updatedContent = matter.stringify(parsed.content, parsed.data);

	// Move to archive
	await writeFile(archiveFile, updatedContent, 'utf-8');
	await unlink(activeFile);

	let result = `## Task Archived: ${id}\n\n`;
	result += `**Title:** ${parsed.data.title}\n`;
	result += `**Status:** ${parsed.data.status}\n`;
	result += `**Archived:** ${parsed.data.archived}\n`;
	result += `**File:** \`archive/${id}.md\`\n\n`;
	result += `✅ Task moved from \`todos/\` to \`archive/\`. It will no longer appear in \`get_next_task\`.`;

	return {
		content: [{ type: 'text', text: result }],
	};
}

/**
 * Add single item to backlog handler
 */
async function addToBacklog(args) {
	const { title, project, priority = 'P2', tags = [], phase, subtasks = [] } = args;

	await ensureProjectDir();

	// Get existing IDs to generate next ID
	const existingIds = await getExistingTaskIds(project.toUpperCase());
	const projectPrefix = project.toUpperCase();

	let nextNum = 1;
	while (existingIds.has(`${projectPrefix}-${String(nextNum).padStart(3, '0')}`)) {
		nextNum++;
	}
	const taskId = `${projectPrefix}-${String(nextNum).padStart(3, '0')}`;

	// Read or create BACKLOG.md
	let backlogContent;
	if (await fileExists(BACKLOG_FILE)) {
		backlogContent = await readFile(BACKLOG_FILE, 'utf-8');
	} else {
		backlogContent = `---
title: Backlog
created: ${getISODate()}
updated: ${getISODate()}
---

# Backlog

**Last Updated:** ${getCurrentDate()}

## Queue

### P0 - Critical

### P1 - High Priority

### P2 - Medium Priority

### P3 - Low Priority

---
*Use \`promote_task\` to move items to active work*
`;
	}

	// Build task entry
	const tagsStr = tags.length > 0 ? ` [${tags.join(', ')}]` : '';
	const phaseStr = phase ? ` (${phase})` : '';
	let taskEntry = `- [ ] **${taskId}**: ${title}${tagsStr}${phaseStr}\n`;
	for (const sub of subtasks) {
		taskEntry += `  - ${sub}\n`;
	}

	// Find priority section and insert
	const sectionHeader =
		priority === 'P0'
			? '### P0 - Critical'
			: priority === 'P1'
				? '### P1 - High Priority'
				: priority === 'P2'
					? '### P2 - Medium Priority'
					: '### P3 - Low Priority';

	if (backlogContent.includes(sectionHeader)) {
		backlogContent = backlogContent.replace(
			new RegExp(`(${sectionHeader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n)`, 'g'),
			`$1${taskEntry}\n`
		);
	}

	// Update timestamp
	backlogContent = backlogContent.replace(
		/\*\*Last Updated:\*\* .*/,
		`**Last Updated:** ${getCurrentDate()}`
	);
	backlogContent = backlogContent.replace(/updated: .*/, `updated: ${getISODate()}`);

	await writeFile(BACKLOG_FILE, backlogContent, 'utf-8');

	let result = `## Added to Backlog: ${taskId}\n\n`;
	result += `**Title:** ${title}\n`;
	result += `**Priority:** ${priority}\n`;
	result += `**Project:** ${projectPrefix}\n`;
	if (tags.length > 0) result += `**Tags:** ${tags.join(', ')}\n`;
	if (phase) result += `**Phase:** ${phase}\n`;
	if (subtasks.length > 0) result += `**Subtasks:** ${subtasks.length}\n`;
	result += `\n✅ Item added to BACKLOG.md. Use \`promote_task\` when ready to start work.`;

	return {
		content: [{ type: 'text', text: result }],
	};
}

/**
 * Get backlog contents handler
 */
async function getBacklog(args) {
	const { priority, project, include_promoted = false } = args || {};

	if (!(await fileExists(BACKLOG_FILE))) {
		return {
			content: [
				{
					type: 'text',
					text: `⚠️ BACKLOG.md not found. Use \`init_project\` or \`add_to_backlog\` to create it.`,
				},
			],
		};
	}

	const backlogContent = await readFile(BACKLOG_FILE, 'utf-8');

	// Parse backlog items
	const items = [];
	const itemRegex =
		/^- \[([ x]|promoted)\] \*\*([A-Z]+-\d+)\*\*:\s*(.+?)(?:\s*\[([^\]]+)\])?(?:\s*\(([^)]+)\))?$/gm;
	let match;

	while ((match = itemRegex.exec(backlogContent)) !== null) {
		const status = match[1] === ' ' ? 'pending' : match[1] === 'x' ? 'done' : 'promoted';
		const id = match[2];
		const title = match[3].trim();
		const tags = match[4] ? match[4].split(',').map((t) => t.trim()) : [];
		const phase = match[5] || null;

		// Detect priority from section
		let itemPriority = 'P2';
		const beforeItem = backlogContent.substring(0, match.index);
		if (beforeItem.lastIndexOf('### P0') > beforeItem.lastIndexOf('### P1')) itemPriority = 'P0';
		else if (beforeItem.lastIndexOf('### P1') > beforeItem.lastIndexOf('### P2')) itemPriority = 'P1';
		else if (beforeItem.lastIndexOf('### P2') > beforeItem.lastIndexOf('### P3')) itemPriority = 'P2';
		else if (beforeItem.includes('### P3')) itemPriority = 'P3';

		items.push({ id, title, status, priority: itemPriority, tags, phase });
	}

	// Apply filters
	let filtered = items;
	if (!include_promoted) {
		filtered = filtered.filter((i) => i.status !== 'promoted');
	}
	if (priority) {
		filtered = filtered.filter((i) => i.priority === priority);
	}
	if (project) {
		filtered = filtered.filter((i) => i.id.startsWith(project.toUpperCase()));
	}

	// Group by priority
	const byPriority = { P0: [], P1: [], P2: [], P3: [] };
	for (const item of filtered) {
		byPriority[item.priority] = byPriority[item.priority] || [];
		byPriority[item.priority].push(item);
	}

	let result = `## Backlog\n\n`;
	result += `**Total:** ${filtered.length} items`;
	if (priority) result += ` (filtered by ${priority})`;
	if (project) result += ` (filtered by ${project.toUpperCase()})`;
	result += `\n\n`;

	for (const pri of ['P0', 'P1', 'P2', 'P3']) {
		if (byPriority[pri].length > 0) {
			result += `### ${pri} (${byPriority[pri].length})\n\n`;
			for (const item of byPriority[pri]) {
				const statusIcon = item.status === 'promoted' ? '✅' : '⬜';
				result += `${statusIcon} **${item.id}**: ${item.title}`;
				if (item.tags.length > 0) result += ` [${item.tags.join(', ')}]`;
				if (item.phase) result += ` (${item.phase})`;
				result += '\n';
			}
			result += '\n';
		}
	}

	if (filtered.length === 0) {
		result += `*No items in backlog${priority ? ` at priority ${priority}` : ''}.*\n`;
	}

	result += `---\n**Tools:** \`add_to_backlog\` | \`promote_task\` | \`update_backlog_item\` | \`remove_from_backlog\``;

	return {
		content: [{ type: 'text', text: result }],
	};
}

/**
 * Update backlog item handler
 */
async function updateBacklogItem(args) {
	const { task_id, title, priority, tags, phase } = args;

	if (!(await fileExists(BACKLOG_FILE))) {
		return {
			content: [{ type: 'text', text: `❌ BACKLOG.md not found.` }],
			isError: true,
		};
	}

	const id = task_id.toUpperCase();
	let backlog = await readFile(BACKLOG_FILE, 'utf-8');

	// Find the task line
	const taskRegex = new RegExp(
		`^(- \\[[ x]\\] \\*\\*${id}\\*\\*:)\\s*(.+?)(?:\\s*\\[([^\\]]+)\\])?(?:\\s*\\(([^)]+)\\))?$`,
		'm'
	);
	const match = backlog.match(taskRegex);

	if (!match) {
		return {
			content: [{ type: 'text', text: `❌ Task ${id} not found in BACKLOG.md` }],
			isError: true,
		};
	}

	const currentTitle = match[2].trim();
	const currentTags = match[3] ? match[3].split(',').map((t) => t.trim()) : [];
	const currentPhase = match[4] || null;

	// Build new entry
	const newTitle = title || currentTitle;
	const newTags = tags !== undefined ? tags : currentTags;
	const newPhase = phase !== undefined ? phase : currentPhase;

	const tagsStr = newTags.length > 0 ? ` [${newTags.join(', ')}]` : '';
	const phaseStr = newPhase ? ` (${newPhase})` : '';
	const newEntry = `- [ ] **${id}**: ${newTitle}${tagsStr}${phaseStr}`;

	const changes = [];
	if (title) changes.push(`title → "${title}"`);
	if (tags !== undefined) changes.push(`tags → [${newTags.join(', ')}]`);
	if (phase !== undefined) changes.push(`phase → ${newPhase || '(none)'}`);

	// If priority changed, need to move to new section
	if (priority) {
		// Remove from current location
		backlog = backlog.replace(taskRegex, '');
		// Clean up empty lines
		backlog = backlog.replace(/\n{3,}/g, '\n\n');

		// Insert into new priority section
		const sectionHeader =
			priority === 'P0'
				? '### P0 - Critical'
				: priority === 'P1'
					? '### P1 - High Priority'
					: priority === 'P2'
						? '### P2 - Medium Priority'
						: '### P3 - Low Priority';

		if (backlog.includes(sectionHeader)) {
			backlog = backlog.replace(
				new RegExp(`(${sectionHeader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n)`, 'g'),
				`$1${newEntry}\n`
			);
		}
		changes.push(`priority → ${priority}`);
	} else {
		// Just update in place
		backlog = backlog.replace(taskRegex, newEntry);
	}

	// Update timestamp
	backlog = backlog.replace(/\*\*Last Updated:\*\* .*/, `**Last Updated:** ${getCurrentDate()}`);
	backlog = backlog.replace(/updated: .*/, `updated: ${getISODate()}`);

	await writeFile(BACKLOG_FILE, backlog, 'utf-8');

	let result = `## Updated Backlog Item: ${id}\n\n`;
	result += `**Changes:**\n${changes.map((c) => `- ${c}`).join('\n')}\n\n`;
	result += `✅ BACKLOG.md updated.`;

	return {
		content: [{ type: 'text', text: result }],
	};
}

/**
 * Remove from backlog handler
 */
async function removeFromBacklog(args) {
	const { task_id, reason } = args;

	if (!(await fileExists(BACKLOG_FILE))) {
		return {
			content: [{ type: 'text', text: `❌ BACKLOG.md not found.` }],
			isError: true,
		};
	}

	const id = task_id.toUpperCase();
	let backlog = await readFile(BACKLOG_FILE, 'utf-8');

	// Find and capture the task line (including any subtasks)
	const taskRegex = new RegExp(`^- \\[[ x]\\] \\*\\*${id}\\*\\*:\\s*.+$(?:\\n  - .+$)*`, 'm');
	const match = backlog.match(taskRegex);

	if (!match) {
		return {
			content: [{ type: 'text', text: `❌ Task ${id} not found in BACKLOG.md` }],
			isError: true,
		};
	}

	const removedEntry = match[0];

	// Remove the task
	backlog = backlog.replace(taskRegex, '');
	// Clean up empty lines
	backlog = backlog.replace(/\n{3,}/g, '\n\n');

	// Update timestamp
	backlog = backlog.replace(/\*\*Last Updated:\*\* .*/, `**Last Updated:** ${getCurrentDate()}`);
	backlog = backlog.replace(/updated: .*/, `updated: ${getISODate()}`);

	await writeFile(BACKLOG_FILE, backlog, 'utf-8');

	let result = `## Removed from Backlog: ${id}\n\n`;
	result += `**Removed:**\n\`\`\`\n${removedEntry}\n\`\`\`\n`;
	if (reason) result += `**Reason:** ${reason}\n`;
	result += `\n✅ Item removed from BACKLOG.md.`;

	return {
		content: [{ type: 'text', text: result }],
	};
}

/**
 * Handler map
 */
export const handlers = {
	import_tasks: importTasks,
	promote_task: promoteTask,
	archive_task: archiveTask,
	add_to_backlog: addToBacklog,
	get_backlog: getBacklog,
	update_backlog_item: updateBacklogItem,
	remove_from_backlog: removeFromBacklog,
};
