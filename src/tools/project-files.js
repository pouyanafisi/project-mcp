/**
 * Project file management tools.
 * Handles: manage_project_file, check_project_state, create_or_update_* tools
 */

import { PROJECT_DIR, TODO_SECTIONS } from '../lib/constants.js';
import { readFile, writeFile, join, ensureProjectDir, fileExists } from '../lib/files.js';
import { getCurrentDate } from '../lib/dates.js';

/**
 * Tool definitions
 */
export const definitions = [
	{
		name: 'manage_project_file',
		description:
			'Smart tool that automatically determines which project file to create or update based on context. Use this when making changes to the project - it will check project state and determine if index.md, ROADMAP.md, TODO.md, STATUS.md, or DECISIONS.md should be created/updated. This is the primary tool for managing project documentation during development.',
		inputSchema: {
			type: 'object',
			properties: {
				action: {
					type: 'string',
					description:
						'The action being performed: "planning" (creates/updates ROADMAP), "task" (creates/updates TODO), "status_change" (creates/updates STATUS), "decision" (creates/updates DECISIONS), "contract" (creates/updates index), "auto" (automatically determines based on content).',
					enum: ['planning', 'task', 'status_change', 'decision', 'contract', 'auto'],
				},
				content: {
					type: 'string',
					description:
						'The content to add or update. For "auto" mode, describe what you\'re doing and the tool will determine the appropriate file.',
				},
				fileType: {
					type: 'string',
					description:
						'Optional: Force a specific file type. If not provided and action is "auto", the tool will determine automatically.',
					enum: ['roadmap', 'todo', 'status', 'index', 'decisions', ''],
				},
			},
			required: ['action', 'content'],
		},
	},
	{
		name: 'check_project_state',
		description:
			'Checks the current state of project management files. Returns which files exist (.project/index.md, ROADMAP.md, TODO.md, STATUS.md, DECISIONS.md) and provides a summary of project state. Use this before making changes to understand what exists.',
		inputSchema: {
			type: 'object',
			properties: {},
		},
	},
	{
		name: 'create_or_update_roadmap',
		description:
			'Creates or updates the ROADMAP.md file in .project/ directory. Use this when planning future work, milestones, or phases. If the file exists, intelligently merges new content with existing roadmap.',
		inputSchema: {
			type: 'object',
			properties: {
				content: {
					type: 'string',
					description:
						'The roadmap content to add. Can be a new section, milestone, or phase. The tool will merge with existing content if the file exists.',
				},
				section: {
					type: 'string',
					description:
						'Optional: The section to add to (e.g., "Q1 2025", "Phase 1", "Future Considerations"). If not provided, will append to appropriate section or create new.',
				},
				replace: {
					type: 'boolean',
					description:
						'If true, replaces the entire file. If false (default), merges with existing content.',
					default: false,
				},
			},
			required: ['content'],
		},
	},
	{
		name: 'create_or_update_todo',
		description:
			'Creates or updates the TODO.md file in .project/ directory. Use this when adding tasks, marking items complete, or updating task status. Intelligently organizes tasks into sections (In Progress, Next Up, Blocked, Completed).',
		inputSchema: {
			type: 'object',
			properties: {
				content: {
					type: 'string',
					description:
						'The task or todo item to add. Can be a single task or multiple tasks. Use markdown checkbox format: "- [ ] Task description".',
				},
				section: {
					type: 'string',
					description:
						'Optional: The section to add to: "in_progress", "next_up", "blocked", "completed". If not provided, defaults to "next_up".',
					enum: ['in_progress', 'next_up', 'blocked', 'completed', ''],
				},
				markComplete: {
					type: 'string',
					description:
						'Optional: Task description to mark as complete. Will move from current section to "Completed" section.',
				},
				replace: {
					type: 'boolean',
					description:
						'If true, replaces the entire file. If false (default), merges with existing content.',
					default: false,
				},
			},
			required: ['content'],
		},
	},
	{
		name: 'create_or_update_status',
		description:
			'Creates or updates the STATUS.md file in .project/ directory. Use this when updating project health, recent changes, metrics, or current phase. Automatically updates the "Last Updated" timestamp.',
		inputSchema: {
			type: 'object',
			properties: {
				content: {
					type: 'string',
					description:
						'The status update content. Can include current phase, health status, recent changes, metrics, risks, or next milestone.',
				},
				updateType: {
					type: 'string',
					description:
						'Optional: Type of update: "phase", "health", "changes", "metrics", "risks", "milestone", "general". Helps organize the update appropriately.',
					enum: ['phase', 'health', 'changes', 'metrics', 'risks', 'milestone', 'general', ''],
				},
				replace: {
					type: 'boolean',
					description:
						'If true, replaces the entire file. If false (default), merges with existing content.',
					default: false,
				},
			},
			required: ['content'],
		},
	},
	{
		name: 'create_or_update_index',
		description:
			'Creates or updates the index.md file in .project/ directory. This is the contract file that defines how agents should interpret sources. Use this when setting up project structure or updating source mappings.',
		inputSchema: {
			type: 'object',
			properties: {
				content: {
					type: 'string',
					description:
						'The contract content to add. Should define source mappings and how agents should interpret different queries.',
				},
				replace: {
					type: 'boolean',
					description:
						'If true, replaces the entire file. If false (default), merges with existing content.',
					default: false,
				},
			},
			required: ['content'],
		},
	},
	{
		name: 'create_or_update_decisions',
		description:
			'Creates or updates the DECISIONS.md file in .project/ directory. Use this when documenting architecture decisions, trade-offs, or rationale. Helps maintain a decision log for the project.',
		inputSchema: {
			type: 'object',
			properties: {
				content: {
					type: 'string',
					description:
						'The decision content to add. Should include the decision, context, trade-offs, and rationale.',
				},
				decisionTitle: {
					type: 'string',
					description:
						'Optional: Title for the decision entry. If not provided, will extract from content or use a timestamp.',
				},
				replace: {
					type: 'boolean',
					description:
						'If true, replaces the entire file. If false (default), merges with existing content.',
					default: false,
				},
			},
			required: ['content'],
		},
	},
];

/**
 * Check project state handler
 */
async function checkProjectState() {
	await ensureProjectDir();

	const indexPath = join(PROJECT_DIR, 'index.md');
	const roadmapPath = join(PROJECT_DIR, 'ROADMAP.md');
	const todoPath = join(PROJECT_DIR, 'TODO.md');
	const statusPath = join(PROJECT_DIR, 'STATUS.md');
	const decisionsPath = join(PROJECT_DIR, 'DECISIONS.md');

	const state = {
		index: await fileExists(indexPath),
		roadmap: await fileExists(roadmapPath),
		todo: await fileExists(todoPath),
		status: await fileExists(statusPath),
		decisions: await fileExists(decisionsPath),
	};

	let summary = '## Project State\n\n';
	summary += `**index.md:** ${state.index ? '✅ Exists' : '❌ Missing'} (Contract file - defines source mappings)\n`;
	summary += `**ROADMAP.md:** ${state.roadmap ? '✅ Exists' : '❌ Missing'} (Future plans, milestones)\n`;
	summary += `**TODO.md:** ${state.todo ? '✅ Exists' : '❌ Missing'} (Current todos, in-progress work)\n`;
	summary += `**STATUS.md:** ${state.status ? '✅ Exists' : '❌ Missing'} (Current project status, health)\n`;
	summary += `**DECISIONS.md:** ${state.decisions ? '✅ Exists' : '❌ Missing'} (Architecture decisions, trade-offs)\n\n`;

	const missingCount = Object.values(state).filter((v) => !v).length;
	if (missingCount > 0) {
		summary += `⚠️ **${missingCount} project management file(s) missing.** Consider creating them:\n`;
		if (!state.index) summary += '- Use `create_or_update_index` to set up the contract file\n';
		if (!state.roadmap) summary += '- Use `create_or_update_roadmap` when planning future work\n';
		if (!state.todo) summary += '- Use `create_or_update_todo` when adding tasks\n';
		if (!state.status) summary += '- Use `create_or_update_status` when updating project health\n';
		if (!state.decisions)
			summary += '- Use `create_or_update_decisions` when documenting architecture decisions\n';
	} else {
		summary += '✅ **All project management files exist.**\n';
	}

	return {
		content: [{ type: 'text', text: summary }],
	};
}

/**
 * Create or update ROADMAP.md
 */
async function createOrUpdateRoadmap(args) {
	const { content, section, replace = false } = args;
	await ensureProjectDir();

	const roadmapPath = join(PROJECT_DIR, 'ROADMAP.md');
	const exists = await fileExists(roadmapPath);

	if (!exists || replace) {
		const roadmapContent = `# Project Roadmap

${content}

---
*Last Updated: ${getCurrentDate()}*
`;
		await writeFile(roadmapPath, roadmapContent, 'utf-8');
		return {
			content: [
				{
					type: 'text',
					text: `✅ ${exists ? 'Updated' : 'Created'} ROADMAP.md\n\n${roadmapContent}`,
				},
			],
		};
	}

	// Merge with existing content
	let existingContent = await readFile(roadmapPath, 'utf-8');
	let updatedContent = existingContent;

	if (section) {
		const sectionRegex = new RegExp(
			`(##+\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^#]*)`,
			'i'
		);
		if (sectionRegex.test(existingContent)) {
			updatedContent = existingContent.replace(sectionRegex, `$1\n\n${content}\n`);
		} else {
			updatedContent = `${existingContent}\n\n## ${section}\n\n${content}\n`;
		}
	} else {
		updatedContent = `${existingContent}\n\n${content}\n`;
	}

	// Update timestamp
	updatedContent = updatedContent.replace(
		/\*Last Updated: .*\*/,
		`*Last Updated: ${getCurrentDate()}*`
	);
	if (!updatedContent.includes('*Last Updated:')) {
		updatedContent += `\n\n---\n*Last Updated: ${getCurrentDate()}*\n`;
	}

	await writeFile(roadmapPath, updatedContent, 'utf-8');
	return {
		content: [
			{
				type: 'text',
				text: `✅ Updated ROADMAP.md\n\nAdded content to ${section || 'the roadmap'}`,
			},
		],
	};
}

/**
 * Create or update TODO.md
 */
async function createOrUpdateTodo(args) {
	const { content, section = 'next_up', markComplete, replace = false } = args;
	await ensureProjectDir();

	const todoPath = join(PROJECT_DIR, 'TODO.md');
	const exists = await fileExists(todoPath);

	if (!exists || replace) {
		const sectionTitle = TODO_SECTIONS[section] || 'Next Up';
		const todoContent = `# TODO

## ${sectionTitle}

${content}

## In Progress

## Next Up

## Blocked

## Completed

---
*Last Updated: ${getCurrentDate()}*
`;
		await writeFile(todoPath, todoContent, 'utf-8');
		return {
			content: [
				{
					type: 'text',
					text: `✅ ${exists ? 'Updated' : 'Created'} TODO.md\n\nAdded to ${sectionTitle} section`,
				},
			],
		};
	}

	// Merge with existing content
	let existingContent = await readFile(todoPath, 'utf-8');

	// Handle marking tasks as complete
	if (markComplete) {
		const taskRegex = new RegExp(
			`(-\\s*\\[\\s*\\]\\s*${markComplete.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
			'gi'
		);
		if (taskRegex.test(existingContent)) {
			existingContent = existingContent.replace(taskRegex, '- [x] ' + markComplete);
			if (!existingContent.includes(`## Completed`)) {
				existingContent += `\n\n## Completed\n\n`;
			}
			if (!existingContent.includes(`- [x] ${markComplete}`)) {
				existingContent = existingContent.replace(/(## Completed\n)/, `$1- [x] ${markComplete}\n`);
			}
		}
	}

	const sectionTitle = TODO_SECTIONS[section] || 'Next Up';

	// Ensure section exists
	if (!existingContent.includes(`## ${sectionTitle}`)) {
		existingContent += `\n\n## ${sectionTitle}\n\n`;
	}

	// Add content to section
	const sectionRegex = new RegExp(
		`(## ${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n)`,
		'i'
	);
	if (sectionRegex.test(existingContent)) {
		existingContent = existingContent.replace(sectionRegex, `$1${content}\n\n`);
	} else {
		existingContent += `\n\n## ${sectionTitle}\n\n${content}\n`;
	}

	// Update timestamp
	existingContent = existingContent.replace(
		/\*Last Updated: .*\*/,
		`*Last Updated: ${getCurrentDate()}*`
	);
	if (!existingContent.includes('*Last Updated:')) {
		existingContent += `\n\n---\n*Last Updated: ${getCurrentDate()}*\n`;
	}

	await writeFile(todoPath, existingContent, 'utf-8');
	return {
		content: [
			{
				type: 'text',
				text: `✅ Updated TODO.md\n\n${markComplete ? `Marked "${markComplete}" as complete. ` : ''}Added content to ${sectionTitle} section`,
			},
		],
	};
}

/**
 * Create or update STATUS.md
 */
async function createOrUpdateStatus(args) {
	const { content, updateType = 'general', replace = false } = args;
	await ensureProjectDir();

	const statusPath = join(PROJECT_DIR, 'STATUS.md');
	const exists = await fileExists(statusPath);

	if (!exists || replace) {
		const statusContent = `# Project Status

**Last Updated:** ${getCurrentDate()}

## Current Phase

${updateType === 'phase' ? content : 'To be determined'}

## Health

${updateType === 'health' ? content : '🟡 **Yellow** - Status unknown'}

## Recent Changes

${updateType === 'changes' ? content : 'No recent changes recorded'}

## Metrics

${updateType === 'metrics' ? content : 'No metrics available'}

## Risks & Blockers

${updateType === 'risks' ? content : 'None currently'}

## Next Milestone

${updateType === 'milestone' ? content : 'No milestone set'}

---
*Last Updated: ${getCurrentDate()}*
`;
		await writeFile(statusPath, statusContent, 'utf-8');
		return {
			content: [
				{
					type: 'text',
					text: `✅ ${exists ? 'Updated' : 'Created'} STATUS.md\n\n${statusContent}`,
				},
			],
		};
	}

	// Merge with existing content
	let existingContent = await readFile(statusPath, 'utf-8');

	const sectionMap = {
		phase: 'Current Phase',
		health: 'Health',
		changes: 'Recent Changes',
		metrics: 'Metrics',
		risks: 'Risks & Blockers',
		milestone: 'Next Milestone',
		general: 'Recent Changes',
	};
	const sectionTitle = sectionMap[updateType] || 'Recent Changes';

	// Ensure section exists
	if (!existingContent.includes(`## ${sectionTitle}`)) {
		existingContent += `\n\n## ${sectionTitle}\n\n`;
	}

	// Update or append to section
	const sectionRegex = new RegExp(
		`(## ${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n)([^#]*)`,
		'i'
	);
	if (sectionRegex.test(existingContent)) {
		if (updateType === 'changes' || updateType === 'general') {
			existingContent = existingContent.replace(sectionRegex, `$1$2\n${content}\n`);
		} else {
			existingContent = existingContent.replace(sectionRegex, `$1${content}\n\n`);
		}
	} else {
		existingContent += `\n\n## ${sectionTitle}\n\n${content}\n`;
	}

	// Update timestamp
	existingContent = existingContent.replace(
		/\*\*Last Updated:\*\* .*/,
		`**Last Updated:** ${getCurrentDate()}`
	);
	existingContent = existingContent.replace(
		/\*Last Updated: .*\*/,
		`*Last Updated: ${getCurrentDate()}*`
	);
	if (!existingContent.includes('Last Updated')) {
		existingContent = existingContent.replace(
			/(# Project Status\n)/,
			`$1\n**Last Updated:** ${getCurrentDate()}\n`
		);
	}

	await writeFile(statusPath, existingContent, 'utf-8');
	return {
		content: [
			{
				type: 'text',
				text: `✅ Updated STATUS.md\n\nUpdated ${sectionTitle} section`,
			},
		],
	};
}

/**
 * Create or update index.md
 */
async function createOrUpdateIndex(args) {
	const { content, replace = false } = args;
	await ensureProjectDir();

	const indexPath = join(PROJECT_DIR, 'index.md');
	const exists = await fileExists(indexPath);

	if (!exists || replace) {
		const indexContent = `# Project Knowledge Index

## Contract for AI Agents

When a user says **"project"**, **"the project"**, or **"my project"**, the canonical sources of truth are, in order:

1. **\`.project/\`** — Current state, plans, todos, decisions, operational truth
2. **Root markdown files** — README.md, DEVELOPMENT.md, ARCHITECTURE.md, etc.
3. **\`docs/\`** — Long-form reference documentation

${content}

## Source Mappings

### "project" / "the project" / "my project"

Searches (in order):

- \`.project/\` directory
- Root-level markdown files (README.md, DEVELOPMENT.md, ARCHITECTURE.md, etc.)
- \`docs/\` directory

### "docs" / "documentation" / "reference"

Searches only:

- \`docs/\` directory

### "plan" / "todos" / "roadmap" / "status" / "operational" / "decisions"

Searches only:

- \`.project/\` directory

## Principles

- **Natural language stays natural** - Users say "project" not ".project/"
- **Repo stays conventional** - Standard directory names
- **Agents don't guess** - Explicit mappings defined here
- **Intent over structure** - Language maps to intent, not directory names

---
*Last Updated: ${getCurrentDate()}*
`;
		await writeFile(indexPath, indexContent, 'utf-8');
		return {
			content: [
				{
					type: 'text',
					text: `✅ ${exists ? 'Updated' : 'Created'} index.md (Contract file)\n\n${exists ? 'Updated' : 'Created'} the contract file that defines how agents should interpret sources.`,
				},
			],
		};
	}

	// Merge with existing content
	let existingContent = await readFile(indexPath, 'utf-8');
	let updatedContent = existingContent;

	if (updatedContent.includes('---')) {
		updatedContent = updatedContent.replace(/\n---\n/, `\n\n${content}\n\n---\n`);
	} else {
		updatedContent = `${updatedContent}\n\n${content}\n`;
	}

	// Update timestamp
	updatedContent = updatedContent.replace(
		/\*Last Updated: .*\*/,
		`*Last Updated: ${getCurrentDate()}*`
	);
	if (!updatedContent.includes('*Last Updated:')) {
		updatedContent += `\n\n---\n*Last Updated: ${getCurrentDate()}*\n`;
	}

	await writeFile(indexPath, updatedContent, 'utf-8');
	return {
		content: [
			{
				type: 'text',
				text: `✅ Updated index.md (Contract file)\n\nAdded content to the contract file.`,
			},
		],
	};
}

/**
 * Create or update DECISIONS.md
 */
async function createOrUpdateDecisions(args) {
	const { content, decisionTitle, replace = false } = args;
	await ensureProjectDir();

	const decisionsPath = join(PROJECT_DIR, 'DECISIONS.md');
	const exists = await fileExists(decisionsPath);

	if (!exists || replace) {
		const title = decisionTitle || `Decision ${getCurrentDate()}`;
		const decisionsContent = `# Architecture Decisions

This document records architecture decisions, trade-offs, and rationale for this project.

## ${title}

${content}

---
*Last Updated: ${getCurrentDate()}*
`;
		await writeFile(decisionsPath, decisionsContent, 'utf-8');
		return {
			content: [
				{
					type: 'text',
					text: `✅ ${exists ? 'Updated' : 'Created'} DECISIONS.md\n\n${decisionsContent}`,
				},
			],
		};
	}

	// Merge with existing content
	let existingContent = await readFile(decisionsPath, 'utf-8');
	let updatedContent = existingContent;

	const title = decisionTitle || `Decision ${getCurrentDate()}`;

	if (updatedContent.includes('---')) {
		updatedContent = updatedContent.replace(/\n---\n/, `\n\n## ${title}\n\n${content}\n\n---\n`);
	} else {
		updatedContent = `${updatedContent}\n\n## ${title}\n\n${content}\n`;
	}

	// Update timestamp
	updatedContent = updatedContent.replace(
		/\*Last Updated: .*\*/,
		`*Last Updated: ${getCurrentDate()}*`
	);
	if (!updatedContent.includes('*Last Updated:')) {
		updatedContent += `\n\n---\n*Last Updated: ${getCurrentDate()}*\n`;
	}

	await writeFile(decisionsPath, updatedContent, 'utf-8');
	return {
		content: [
			{
				type: 'text',
				text: `✅ Updated DECISIONS.md\n\nAdded decision: ${title}`,
			},
		],
	};
}

/**
 * Smart manage project file handler
 */
async function manageProjectFile(args) {
	const { action, content, fileType } = args;

	await ensureProjectDir();

	// If fileType is explicitly provided, use it
	if (fileType) {
		switch (fileType) {
			case 'roadmap':
				return await createOrUpdateRoadmap({ content });
			case 'todo':
				return await createOrUpdateTodo({ content });
			case 'status':
				return await createOrUpdateStatus({ content });
			case 'index':
				return await createOrUpdateIndex({ content });
			case 'decisions':
				return await createOrUpdateDecisions({ content });
		}
	}

	// Determine based on action
	if (action === 'auto') {
		const contentLower = content.toLowerCase();
		if (/\b(contract|source mapping|intent|agent|interpret|canonical)\b/.test(contentLower)) {
			return await createOrUpdateIndex({ content });
		} else if (
			/\b(roadmap|milestone|phase|quarter|q[1-4]|future|plan|planning)\b/.test(contentLower)
		) {
			return await createOrUpdateRoadmap({ content });
		} else if (/\b(task|todo|todo|in progress|blocked|complete|done|finish)\b/.test(contentLower)) {
			return await createOrUpdateTodo({ content });
		} else if (/\b(status|health|phase|metric|risk|blocker|milestone|update)\b/.test(contentLower)) {
			return await createOrUpdateStatus({ content });
		} else if (
			/\b(decision|architecture|trade.?off|rationale|adr|choice|selected)\b/.test(contentLower)
		) {
			return await createOrUpdateDecisions({ content });
		} else {
			return await createOrUpdateTodo({ content });
		}
	}

	// Map action to file type
	switch (action) {
		case 'planning':
			return await createOrUpdateRoadmap({ content });
		case 'task':
			return await createOrUpdateTodo({ content });
		case 'status_change':
			return await createOrUpdateStatus({ content });
		case 'decision':
			return await createOrUpdateDecisions({ content });
		case 'contract':
			return await createOrUpdateIndex({ content });
		default:
			return await createOrUpdateTodo({ content });
	}
}

/**
 * Handler map
 */
export const handlers = {
	manage_project_file: manageProjectFile,
	check_project_state: checkProjectState,
	create_or_update_roadmap: createOrUpdateRoadmap,
	create_or_update_todo: createOrUpdateTodo,
	create_or_update_status: createOrUpdateStatus,
	create_or_update_index: createOrUpdateIndex,
	create_or_update_decisions: createOrUpdateDecisions,
};
