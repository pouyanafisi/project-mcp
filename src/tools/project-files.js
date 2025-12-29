/**
 * Project file management tools.
 * Handles: manage_project_file, check_project_state, create_or_update_* tools,
 * add_decision, list_decisions, update_project_status, add_roadmap_milestone
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
	{
		name: 'add_decision',
		description:
			'Adds a single architecture decision record (ADR) to DECISIONS.md. Creates a structured entry with title, context, decision, and consequences sections.',
		inputSchema: {
			type: 'object',
			properties: {
				title: {
					type: 'string',
					description: 'Title of the decision (e.g., "Use PostgreSQL for primary database").',
				},
				context: {
					type: 'string',
					description: 'The context and problem statement that led to this decision.',
				},
				decision: {
					type: 'string',
					description: 'The decision that was made.',
				},
				consequences: {
					type: 'string',
					description: 'The positive and negative consequences of the decision.',
				},
				status: {
					type: 'string',
					description: 'Status of the decision. Default: "accepted".',
					enum: ['proposed', 'accepted', 'deprecated', 'superseded'],
					default: 'accepted',
				},
				tags: {
					type: 'array',
					items: { type: 'string' },
					description: 'Tags for categorization (e.g., ["database", "infrastructure"]).',
				},
			},
			required: ['title', 'decision'],
		},
	},
	{
		name: 'list_decisions',
		description:
			'Lists all architecture decisions from DECISIONS.md with optional filtering by status or tag.',
		inputSchema: {
			type: 'object',
			properties: {
				status: {
					type: 'string',
					description: 'Filter by status.',
					enum: ['proposed', 'accepted', 'deprecated', 'superseded', ''],
				},
				tag: {
					type: 'string',
					description: 'Filter by tag.',
				},
			},
		},
	},
	{
		name: 'update_project_status',
		description:
			'Quick status update for the project. Adds a timestamped entry to STATUS.md with the current status, changes, or notes.',
		inputSchema: {
			type: 'object',
			properties: {
				status: {
					type: 'string',
					description: 'Current status summary (e.g., "On track", "Blocked by API issues").',
				},
				health: {
					type: 'string',
					description: 'Project health indicator.',
					enum: ['green', 'yellow', 'red'],
				},
				changes: {
					type: 'array',
					items: { type: 'string' },
					description: 'List of recent changes or updates.',
				},
				blockers: {
					type: 'array',
					items: { type: 'string' },
					description: 'Current blockers or risks.',
				},
				next_milestone: {
					type: 'string',
					description: 'Next milestone or goal.',
				},
			},
			required: ['status'],
		},
	},
	{
		name: 'add_roadmap_milestone',
		description:
			'Adds a milestone or phase to ROADMAP.md. Creates a structured entry with title, description, target date, and deliverables.',
		inputSchema: {
			type: 'object',
			properties: {
				title: {
					type: 'string',
					description: 'Milestone title (e.g., "v1.0 Release", "Q1 2025").',
				},
				description: {
					type: 'string',
					description: 'Description of the milestone.',
				},
				target_date: {
					type: 'string',
					description: 'Target date (e.g., "2025-03-01", "Q1 2025").',
				},
				deliverables: {
					type: 'array',
					items: { type: 'string' },
					description: 'List of deliverables for this milestone.',
				},
				status: {
					type: 'string',
					description: 'Status of the milestone. Default: "planned".',
					enum: ['planned', 'in_progress', 'completed', 'delayed'],
					default: 'planned',
				},
			},
			required: ['title'],
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
 * Add decision handler
 */
async function addDecision(args) {
	const { title, context, decision, consequences, status = 'accepted', tags = [] } = args;
	await ensureProjectDir();

	const decisionsPath = join(PROJECT_DIR, 'DECISIONS.md');
	const exists = await fileExists(decisionsPath);

	// Generate decision ID based on existing decisions
	let decisionNum = 1;
	let existingContent = '';
	if (exists) {
		existingContent = await readFile(decisionsPath, 'utf-8');
		const matches = existingContent.match(/## ADR-(\d+)/g) || [];
		if (matches.length > 0) {
			const nums = matches.map((m) => parseInt(m.replace('## ADR-', '')));
			decisionNum = Math.max(...nums) + 1;
		}
	}

	const decisionId = `ADR-${String(decisionNum).padStart(3, '0')}`;
	const tagsStr = tags.length > 0 ? `\n**Tags:** ${tags.join(', ')}` : '';

	const entry = `## ${decisionId}: ${title}

**Date:** ${getCurrentDate()}
**Status:** ${status}${tagsStr}

### Context

${context || 'No context provided.'}

### Decision

${decision}

### Consequences

${consequences || 'Not documented.'}

`;

	if (!exists) {
		const decisionsContent = `# Architecture Decisions

This document records architecture decisions, trade-offs, and rationale for this project.

${entry}
---
*Last Updated: ${getCurrentDate()}*
`;
		await writeFile(decisionsPath, decisionsContent, 'utf-8');
	} else {
		// Insert before the footer
		let updatedContent = existingContent;
		if (updatedContent.includes('---\n*Last Updated:')) {
			updatedContent = updatedContent.replace(
				/---\n\*Last Updated:.*\*/,
				`${entry}---\n*Last Updated: ${getCurrentDate()}*`
			);
		} else {
			updatedContent = `${updatedContent}\n${entry}\n---\n*Last Updated: ${getCurrentDate()}*\n`;
		}
		await writeFile(decisionsPath, updatedContent, 'utf-8');
	}

	let result = `## Decision Recorded: ${decisionId}\n\n`;
	result += `**Title:** ${title}\n`;
	result += `**Status:** ${status}\n`;
	if (tags.length > 0) result += `**Tags:** ${tags.join(', ')}\n`;
	result += `\n✅ Added to DECISIONS.md`;

	return {
		content: [{ type: 'text', text: result }],
	};
}

/**
 * List decisions handler
 */
async function listDecisions(args) {
	const { status, tag } = args || {};
	await ensureProjectDir();

	const decisionsPath = join(PROJECT_DIR, 'DECISIONS.md');
	if (!(await fileExists(decisionsPath))) {
		return {
			content: [
				{
					type: 'text',
					text: `⚠️ DECISIONS.md not found. Use \`add_decision\` to create your first decision record.`,
				},
			],
		};
	}

	const content = await readFile(decisionsPath, 'utf-8');

	// Parse decisions
	const decisions = [];
	const decisionRegex =
		/## (ADR-\d+): ([^\n]+)\n\n\*\*Date:\*\* ([^\n]+)\n\*\*Status:\*\* ([^\n]+)(?:\n\*\*Tags:\*\* ([^\n]+))?/g;
	let match;

	while ((match = decisionRegex.exec(content)) !== null) {
		decisions.push({
			id: match[1],
			title: match[2],
			date: match[3],
			status: match[4].toLowerCase(),
			tags: match[5] ? match[5].split(',').map((t) => t.trim().toLowerCase()) : [],
		});
	}

	// Apply filters
	let filtered = decisions;
	if (status) {
		filtered = filtered.filter((d) => d.status === status.toLowerCase());
	}
	if (tag) {
		filtered = filtered.filter((d) => d.tags.includes(tag.toLowerCase()));
	}

	let result = `## Architecture Decisions\n\n`;
	result += `**Total:** ${filtered.length} decision(s)`;
	if (status) result += ` (filtered by status: ${status})`;
	if (tag) result += ` (filtered by tag: ${tag})`;
	result += `\n\n`;

	if (filtered.length === 0) {
		result += `*No decisions found${status || tag ? ' with the specified filters' : ''}.*\n`;
	} else {
		result += `| ID | Title | Status | Date |\n`;
		result += `|----|-------|--------|------|\n`;
		for (const d of filtered) {
			result += `| ${d.id} | ${d.title.substring(0, 40)}${d.title.length > 40 ? '...' : ''} | ${d.status} | ${d.date} |\n`;
		}
	}

	result += `\n---\n**Tools:** \`add_decision\` | \`create_or_update_decisions\``;

	return {
		content: [{ type: 'text', text: result }],
	};
}

/**
 * Update project status handler
 */
async function updateProjectStatus(args) {
	const { status, health, changes = [], blockers = [], next_milestone } = args;
	await ensureProjectDir();

	const statusPath = join(PROJECT_DIR, 'STATUS.md');
	const exists = await fileExists(statusPath);

	const healthEmoji =
		health === 'green' ? '🟢' : health === 'yellow' ? '🟡' : health === 'red' ? '🔴' : '⚪';
	const healthText = health ? `${healthEmoji} **${health.toUpperCase()}**` : '';

	const statusEntry = `### Status Update - ${getCurrentDate()}

**Status:** ${status}
${healthText ? `**Health:** ${healthText}\n` : ''}${changes.length > 0 ? `**Recent Changes:**\n${changes.map((c) => `- ${c}`).join('\n')}\n` : ''}${blockers.length > 0 ? `**Blockers:**\n${blockers.map((b) => `- ⚠️ ${b}`).join('\n')}\n` : ''}${next_milestone ? `**Next Milestone:** ${next_milestone}\n` : ''}
`;

	if (!exists) {
		const statusContent = `# Project Status

**Last Updated:** ${getCurrentDate()}

## Current Status

${statusEntry}

## Status History

---
*Last Updated: ${getCurrentDate()}*
`;
		await writeFile(statusPath, statusContent, 'utf-8');
	} else {
		let existingContent = await readFile(statusPath, 'utf-8');

		// Update the "Last Updated" timestamp
		existingContent = existingContent.replace(
			/\*\*Last Updated:\*\* .*/,
			`**Last Updated:** ${getCurrentDate()}`
		);

		// Insert new status entry after "## Current Status" or "## Status History"
		if (existingContent.includes('## Status History')) {
			existingContent = existingContent.replace(/(## Status History\n)/, `$1\n${statusEntry}`);
		} else if (existingContent.includes('## Current Status')) {
			existingContent = existingContent.replace(/(## Current Status\n)/, `$1\n${statusEntry}`);
		} else {
			existingContent = `${existingContent}\n\n## Status Updates\n\n${statusEntry}`;
		}

		existingContent = existingContent.replace(
			/\*Last Updated: .*\*/,
			`*Last Updated: ${getCurrentDate()}*`
		);

		await writeFile(statusPath, existingContent, 'utf-8');
	}

	let result = `## Status Updated\n\n`;
	result += `**Status:** ${status}\n`;
	if (health) result += `**Health:** ${healthEmoji} ${health}\n`;
	if (changes.length > 0) result += `**Changes:** ${changes.length} items\n`;
	if (blockers.length > 0) result += `**Blockers:** ${blockers.length} items\n`;
	if (next_milestone) result += `**Next Milestone:** ${next_milestone}\n`;
	result += `\n✅ STATUS.md updated`;

	return {
		content: [{ type: 'text', text: result }],
	};
}

/**
 * Add roadmap milestone handler
 */
async function addRoadmapMilestone(args) {
	const { title, description, target_date, deliverables = [], status = 'planned' } = args;
	await ensureProjectDir();

	const roadmapPath = join(PROJECT_DIR, 'ROADMAP.md');
	const exists = await fileExists(roadmapPath);

	const statusEmoji =
		status === 'completed'
			? '✅'
			: status === 'in_progress'
				? '🔵'
				: status === 'delayed'
					? '🔴'
					: '⬜';

	let milestoneEntry = `## ${statusEmoji} ${title}\n\n`;
	if (target_date) milestoneEntry += `**Target:** ${target_date}\n`;
	milestoneEntry += `**Status:** ${status}\n\n`;
	if (description) milestoneEntry += `${description}\n\n`;
	if (deliverables.length > 0) {
		milestoneEntry += `### Deliverables\n\n`;
		for (const d of deliverables) {
			milestoneEntry += `- [ ] ${d}\n`;
		}
		milestoneEntry += '\n';
	}

	if (!exists) {
		const roadmapContent = `# Project Roadmap

${milestoneEntry}

---
*Last Updated: ${getCurrentDate()}*
`;
		await writeFile(roadmapPath, roadmapContent, 'utf-8');
	} else {
		let existingContent = await readFile(roadmapPath, 'utf-8');

		// Insert before the footer
		if (existingContent.includes('---\n*Last Updated:')) {
			existingContent = existingContent.replace(
				/---\n\*Last Updated:.*\*/,
				`${milestoneEntry}\n---\n*Last Updated: ${getCurrentDate()}*`
			);
		} else {
			existingContent = `${existingContent}\n\n${milestoneEntry}\n---\n*Last Updated: ${getCurrentDate()}*\n`;
		}

		await writeFile(roadmapPath, existingContent, 'utf-8');
	}

	let result = `## Milestone Added: ${title}\n\n`;
	result += `**Status:** ${statusEmoji} ${status}\n`;
	if (target_date) result += `**Target:** ${target_date}\n`;
	if (deliverables.length > 0) result += `**Deliverables:** ${deliverables.length} items\n`;
	result += `\n✅ Added to ROADMAP.md`;

	return {
		content: [{ type: 'text', text: result }],
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
	add_decision: addDecision,
	list_decisions: listDecisions,
	update_project_status: updateProjectStatus,
	add_roadmap_milestone: addRoadmapMilestone,
};
