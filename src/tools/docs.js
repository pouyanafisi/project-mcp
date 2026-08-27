/**
 * Documentation management tools for the docs/ directory.
 * These tools manage APPLICATION documentation (reference docs, architecture, release notes)
 * as opposed to PROJECT MANAGEMENT files in .project/ (status, todos, roadmap, backlog).
 *
 * IMPORTANT DISTINCTION FOR NLP:
 * - Use these tools when updating long-form reference documentation, API docs, guides
 * - Use .project/ tools for tracking work progress, project status, operational decisions
 */

import { DOCS_DIR } from '../lib/constants.js';
import { readFile, writeFile, join, fileExists, mkdir, readdir, stat } from '../lib/files.js';
import { getCurrentDate } from '../lib/dates.js';

/**
 * Tool definitions for docs/ management
 */
export const definitions = [
	{
		name: 'create_doc',
		description:
			'Creates a new documentation file in the docs/ directory. Use this for APPLICATION DOCUMENTATION like API references, user guides, architecture specs, and how-to guides. Do NOT use this for project management (use .project/ tools instead). The docs/ directory is for permanent reference documentation that explains how the system works.',
		inputSchema: {
			type: 'object',
			properties: {
				path: {
					type: 'string',
					description:
						'Path within docs/ directory (e.g., "architecture/API.md", "guides/GETTING_STARTED.md"). Subdirectories will be created automatically.',
				},
				title: {
					type: 'string',
					description: 'Title for the document (will be added as H1 header).',
				},
				content: {
					type: 'string',
					description: 'The markdown content of the document.',
				},
				category: {
					type: 'string',
					description:
						'Document category for organization: "architecture", "api", "guides", "reference", "operations", "releases".',
					enum: ['architecture', 'api', 'guides', 'reference', 'operations', 'releases'],
				},
				description: {
					type: 'string',
					description: 'Brief description of the document (for indexes and search).',
				},
			},
			required: ['path', 'title', 'content'],
		},
	},
	{
		name: 'update_doc',
		description:
			'Updates an existing documentation file in the docs/ directory. Use this for APPLICATION DOCUMENTATION changes like updating API references, correcting guides, or adding new sections. For project management updates (status, progress, operational notes), use the .project/ tools instead.',
		inputSchema: {
			type: 'object',
			properties: {
				path: {
					type: 'string',
					description:
						'Path to the document within docs/ (e.g., "architecture/API.md"). Use list_docs or search_docs to find paths.',
				},
				content: {
					type: 'string',
					description: 'New content to add or the full updated content (depending on mode).',
				},
				mode: {
					type: 'string',
					description:
						'"append" adds content to the end, "prepend" adds to the beginning after title, "replace" replaces the entire document, "section" updates a specific section.',
					enum: ['append', 'prepend', 'replace', 'section'],
					default: 'append',
				},
				section: {
					type: 'string',
					description:
						'When mode is "section", the heading name to update (e.g., "## Installation", "### API Reference").',
				},
			},
			required: ['path', 'content'],
		},
	},
	{
		name: 'add_release_note',
		description:
			'Adds a release note to the docs/releases/ directory. Use this when documenting a new version release, changelog entry, or version update. Creates a properly formatted release note with version, date, and categorized changes.',
		inputSchema: {
			type: 'object',
			properties: {
				version: {
					type: 'string',
					description: 'Version number (e.g., "1.2.0", "v2.0.0-beta").',
				},
				title: {
					type: 'string',
					description: 'Release title/codename (e.g., "Performance Release", "Security Update").',
				},
				summary: {
					type: 'string',
					description: 'Brief summary of the release.',
				},
				features: {
					type: 'array',
					items: { type: 'string' },
					description: 'List of new features added in this release.',
				},
				fixes: {
					type: 'array',
					items: { type: 'string' },
					description: 'List of bug fixes in this release.',
				},
				breaking_changes: {
					type: 'array',
					items: { type: 'string' },
					description: 'List of breaking changes (if any).',
				},
				deprecations: {
					type: 'array',
					items: { type: 'string' },
					description: 'List of deprecated features (if any).',
				},
			},
			required: ['version'],
		},
	},
	{
		name: 'update_architecture_doc',
		description:
			'Creates or updates architecture documentation in docs/. Use this for documenting system design, component relationships, data flow, and technical architecture. This is for PERMANENT reference documentation explaining how the system is built, not for operational decisions (use add_decision in .project/ for those).',
		inputSchema: {
			type: 'object',
			properties: {
				topic: {
					type: 'string',
					description:
						'Architecture topic (e.g., "system-overview", "data-flow", "authentication", "api-design").',
				},
				title: {
					type: 'string',
					description: 'Document title.',
				},
				content: {
					type: 'string',
					description: 'Architecture documentation content in markdown.',
				},
				diagrams: {
					type: 'array',
					items: { type: 'string' },
					description: 'Optional: Mermaid or ASCII diagram descriptions to include.',
				},
				replace: {
					type: 'boolean',
					description: 'If true, replaces existing document. If false, merges/appends.',
					default: false,
				},
			},
			required: ['topic', 'content'],
		},
	},
	{
		name: 'list_doc_categories',
		description:
			'Lists all documentation categories and their contents in the docs/ directory. Use this to understand what application documentation exists before creating or updating docs.',
		inputSchema: {
			type: 'object',
			properties: {
				category: {
					type: 'string',
					description: 'Optional: Filter by specific category.',
				},
			},
		},
	},
];

/**
 * Ensure docs directory exists
 */
async function ensureDocsDir(subdir = '') {
	const targetDir = subdir ? join(DOCS_DIR, subdir) : DOCS_DIR;
	try {
		await mkdir(targetDir, { recursive: true });
	} catch (error) {
		// Directory might already exist
	}
	return targetDir;
}

/**
 * Ensure docs/README.md exists with a default index
 */
async function ensureDocsReadme() {
	const readmePath = join(DOCS_DIR, 'README.md');
	if (!(await fileExists(readmePath))) {
		const defaultReadme = `# Documentation

> Project documentation index.

## Contents

This directory contains project documentation organized by category:

| Directory | Purpose |
|-----------|---------|
| \`architecture/\` | System design and technical decisions |
| \`api/\` | API reference documentation |
| \`guides/\` | Step-by-step tutorials and guides |
| \`reference/\` | Technical specifications |
| \`releases/\` | Release notes and changelog |

## Adding Documentation

Use the project-mcp tools to manage documentation:
- \`create_doc\` — Create new documentation
- \`update_doc\` — Update existing documentation
- \`list_doc_categories\` — List all documentation

---

*Last Updated: ${getCurrentDate()}*
`;
		await writeFile(readmePath, defaultReadme, 'utf-8');
		return true;
	}
	return false;
}

/**
 * Ensure a subdirectory has a README.md index
 */
async function ensureSubdirReadme(subdir, categoryTitle) {
	const readmePath = join(DOCS_DIR, subdir, 'README.md');
	if (!(await fileExists(readmePath))) {
		const defaultReadme = `# ${categoryTitle || subdir.charAt(0).toUpperCase() + subdir.slice(1)} Documentation

> Index of ${subdir} documentation.

## Documents

*Documents will be listed here as they are added.*

---

*Last Updated: ${getCurrentDate()}*
`;
		await writeFile(readmePath, defaultReadme, 'utf-8');
		return true;
	}
	return false;
}

/**
 * Create a new documentation file
 */
async function createDoc(args) {
	const { path, title, content, category, description } = args;

	// Ensure the main docs/README.md exists
	const createdDocsReadme = await ensureDocsReadme();

	// Ensure the directory exists
	const pathParts = path.split('/');
	let createdSubdirReadme = false;
	if (pathParts.length > 1) {
		const dir = pathParts.slice(0, -1).join('/');
		await ensureDocsDir(dir);

		// Ensure subdirectory has a README.md
		const categoryTitle = category
			? category.charAt(0).toUpperCase() + category.slice(1)
			: dir.charAt(0).toUpperCase() + dir.slice(1);
		createdSubdirReadme = await ensureSubdirReadme(dir, categoryTitle);
	}

	const fullPath = join(DOCS_DIR, path);

	// Check if file already exists
	if (await fileExists(fullPath)) {
		return {
			content: [
				{
					type: 'text',
					text: `⚠️ Document already exists at docs/${path}. Use \`update_doc\` to modify it.`,
				},
			],
			isError: true,
		};
	}

	// Build the document
	let docContent = `# ${title}\n\n`;
	if (description) {
		docContent += `> ${description}\n\n`;
	}
	docContent += `${content}\n\n`;
	docContent += `---\n*Last Updated: ${getCurrentDate()}*\n`;

	await writeFile(fullPath, docContent, 'utf-8');

	let resultText = `✅ Created documentation: docs/${path}\n\n**Title:** ${title}\n`;
	if (category) resultText += `**Category:** ${category}\n`;
	if (description) resultText += `**Description:** ${description}\n`;
	if (createdDocsReadme) resultText += `\n📁 Also created docs/README.md index`;
	if (createdSubdirReadme) resultText += `\n📁 Also created ${pathParts.slice(0, -1).join('/')}/README.md index`;

	return {
		content: [
			{
				type: 'text',
				text: resultText,
			},
		],
	};
}

/**
 * Update an existing documentation file
 */
async function updateDoc(args) {
	const { path, content, mode = 'append', section } = args;

	const fullPath = join(DOCS_DIR, path);

	// Check if file exists
	if (!(await fileExists(fullPath))) {
		return {
			content: [
				{
					type: 'text',
					text: `❌ Document not found: docs/${path}. Use \`create_doc\` to create it first, or check the path with \`list_docs\`.`,
				},
			],
			isError: true,
		};
	}

	let existingContent = await readFile(fullPath, 'utf-8');
	let updatedContent;

	switch (mode) {
		case 'replace':
			updatedContent = content;
			break;

		case 'prepend':
			// Find the end of the title (first H1) and insert after
			const titleMatch = existingContent.match(/^# .+\n\n?/);
			if (titleMatch) {
				updatedContent = titleMatch[0] + content + '\n\n' + existingContent.slice(titleMatch[0].length);
			} else {
				updatedContent = content + '\n\n' + existingContent;
			}
			break;

		case 'section':
			if (!section) {
				return {
					content: [{ type: 'text', text: '❌ Section name required when mode is "section".' }],
					isError: true,
				};
			}
			// Find and update the section
			const sectionRegex = new RegExp(
				`(${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n)([\\s\\S]*?)(?=\\n## |\\n---\\n|$)`,
				'i'
			);
			if (sectionRegex.test(existingContent)) {
				updatedContent = existingContent.replace(sectionRegex, `$1\n${content}\n`);
			} else {
				// Section doesn't exist, append it
				updatedContent = existingContent.replace(
					/(\n---\n\*Last Updated:.*\*)?$/,
					`\n\n${section}\n\n${content}\n$1`
				);
			}
			break;

		case 'append':
		default:
			// Append before the footer if it exists
			if (existingContent.includes('---\n*Last Updated:')) {
				updatedContent = existingContent.replace(
					/---\n\*Last Updated:.*\*/,
					`\n${content}\n\n---\n*Last Updated: ${getCurrentDate()}*`
				);
			} else {
				updatedContent = existingContent + '\n\n' + content;
			}
			break;
	}

	// Update timestamp
	updatedContent = updatedContent.replace(/\*Last Updated: .*\*/, `*Last Updated: ${getCurrentDate()}*`);
	if (!updatedContent.includes('*Last Updated:')) {
		updatedContent += `\n\n---\n*Last Updated: ${getCurrentDate()}*\n`;
	}

	await writeFile(fullPath, updatedContent, 'utf-8');

	return {
		content: [
			{
				type: 'text',
				text: `✅ Updated documentation: docs/${path}\n\n**Mode:** ${mode}${section ? `\n**Section:** ${section}` : ''}`,
			},
		],
	};
}

/**
 * Add a release note
 */
async function addReleaseNote(args) {
	const { version, title, summary, features = [], fixes = [], breaking_changes = [], deprecations = [] } = args;

	// Ensure docs structure exists
	await ensureDocsReadme();
	await ensureDocsDir('releases');
	await ensureSubdirReadme('releases', 'Release Notes');

	// Clean version for filename
	const cleanVersion = version.replace(/^v/, '');
	const filename = `RELEASE_NOTES_v${cleanVersion}.md`;
	const fullPath = join(DOCS_DIR, 'releases', filename);

	// Check if release note already exists
	if (await fileExists(fullPath)) {
		return {
			content: [
				{
					type: 'text',
					text: `⚠️ Release note already exists for version ${version}. Use \`update_doc\` to modify it.`,
				},
			],
			isError: true,
		};
	}

	// Build release note
	let content = `# Release Notes - v${cleanVersion}${title ? ` "${title}"` : ''}\n\n`;
	content += `**Release Date:** ${getCurrentDate()}\n\n`;

	if (summary) {
		content += `## Summary\n\n${summary}\n\n`;
	}

	if (features.length > 0) {
		content += `## ✨ New Features\n\n`;
		features.forEach(f => {
			content += `- ${f}\n`;
		});
		content += '\n';
	}

	if (fixes.length > 0) {
		content += `## 🐛 Bug Fixes\n\n`;
		fixes.forEach(f => {
			content += `- ${f}\n`;
		});
		content += '\n';
	}

	if (breaking_changes.length > 0) {
		content += `## ⚠️ Breaking Changes\n\n`;
		breaking_changes.forEach(b => {
			content += `- ${b}\n`;
		});
		content += '\n';
	}

	if (deprecations.length > 0) {
		content += `## 📦 Deprecations\n\n`;
		deprecations.forEach(d => {
			content += `- ${d}\n`;
		});
		content += '\n';
	}

	content += `---\n*Generated: ${getCurrentDate()}*\n`;

	await writeFile(fullPath, content, 'utf-8');

	// Also update the releases README if it exists
	const readmePath = join(DOCS_DIR, 'releases', 'README.md');
	if (await fileExists(readmePath)) {
		let readmeContent = await readFile(readmePath, 'utf-8');
		const entryLine = `- [v${cleanVersion}](./RELEASE_NOTES_v${cleanVersion}.md)${title ? ` - ${title}` : ''} (${getCurrentDate()})\n`;

		// Add to the list (assuming there's a list section)
		if (readmeContent.includes('## Release History')) {
			readmeContent = readmeContent.replace(/(## Release History\n\n?)/, `$1${entryLine}`);
			await writeFile(readmePath, readmeContent, 'utf-8');
		}
	}

	let result = `## Release Note Created: v${cleanVersion}\n\n`;
	result += `**File:** docs/releases/${filename}\n`;
	if (title) result += `**Title:** ${title}\n`;
	if (features.length > 0) result += `**Features:** ${features.length}\n`;
	if (fixes.length > 0) result += `**Fixes:** ${fixes.length}\n`;
	if (breaking_changes.length > 0) result += `**Breaking Changes:** ${breaking_changes.length}\n`;
	result += `\n✅ Added to docs/releases/`;

	return {
		content: [{ type: 'text', text: result }],
	};
}

/**
 * Update architecture documentation
 */
async function updateArchitectureDoc(args) {
	const { topic, title, content, diagrams = [], replace = false } = args;

	// Ensure docs structure exists
	await ensureDocsReadme();
	await ensureDocsDir('architecture');
	await ensureSubdirReadme('architecture', 'Architecture Documentation');

	// Create filename from topic
	const filename = `${topic.toLowerCase().replace(/\s+/g, '-')}.md`;
	const fullPath = join(DOCS_DIR, 'architecture', filename);
	const exists = await fileExists(fullPath);

	if (!exists || replace) {
		// Build new architecture document
		let docContent = `# ${title || topic}\n\n`;
		docContent += content;

		if (diagrams.length > 0) {
			docContent += '\n\n## Diagrams\n\n';
			diagrams.forEach((diagram, i) => {
				docContent += `### Diagram ${i + 1}\n\n\`\`\`mermaid\n${diagram}\n\`\`\`\n\n`;
			});
		}

		docContent += `\n---\n*Last Updated: ${getCurrentDate()}*\n`;

		await writeFile(fullPath, docContent, 'utf-8');

		return {
			content: [
				{
					type: 'text',
					text: `✅ ${exists ? 'Replaced' : 'Created'} architecture doc: docs/architecture/${filename}\n\n**Topic:** ${topic}\n${title ? `**Title:** ${title}\n` : ''}`,
				},
			],
		};
	}

	// Merge with existing content
	let existingContent = await readFile(fullPath, 'utf-8');

	// Append new content before footer
	if (existingContent.includes('---\n*Last Updated:')) {
		existingContent = existingContent.replace(
			/---\n\*Last Updated:.*\*/,
			`\n${content}\n\n---\n*Last Updated: ${getCurrentDate()}*`
		);
	} else {
		existingContent += `\n\n${content}\n\n---\n*Last Updated: ${getCurrentDate()}*\n`;
	}

	// Add diagrams if provided
	if (diagrams.length > 0) {
		const diagramsSection = diagrams
			.map((d, i) => `### Diagram ${i + 1}\n\n\`\`\`mermaid\n${d}\n\`\`\`\n`)
			.join('\n');
		if (existingContent.includes('## Diagrams')) {
			existingContent = existingContent.replace(/(## Diagrams\n)/, `$1\n${diagramsSection}\n`);
		} else {
			existingContent = existingContent.replace(
				/(\n---\n\*Last Updated:)/,
				`\n## Diagrams\n\n${diagramsSection}\n$1`
			);
		}
	}

	await writeFile(fullPath, existingContent, 'utf-8');

	return {
		content: [
			{
				type: 'text',
				text: `✅ Updated architecture doc: docs/architecture/${filename}\n\n**Topic:** ${topic}`,
			},
		],
	};
}

/**
 * List documentation categories
 */
async function listDocCategories(args) {
	const { category } = args || {};

	const categories = {};

	try {
		const entries = await readdir(DOCS_DIR, { withFileTypes: true });

		for (const entry of entries) {
			if (entry.isDirectory()) {
				const catName = entry.name;
				if (category && catName !== category) continue;

				const catPath = join(DOCS_DIR, catName);
				try {
					const files = await readdir(catPath);
					const mdFiles = files.filter(f => f.endsWith('.md'));
					categories[catName] = mdFiles.map(f => `docs/${catName}/${f}`);
				} catch {
					// Skip unreadable directories
				}
			} else if (entry.isFile() && entry.name.endsWith('.md')) {
				if (!categories['root']) categories['root'] = [];
				categories['root'].push(`docs/${entry.name}`);
			}
		}
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `⚠️ Could not read docs directory: ${error.message}`,
				},
			],
			isError: true,
		};
	}

	let result = `## Documentation Categories\n\n`;
	const catCount = Object.keys(categories).length;
	const fileCount = Object.values(categories).flat().length;
	result += `**${catCount} categories, ${fileCount} documents**\n\n`;

	for (const [cat, files] of Object.entries(categories)) {
		result += `### 📁 ${cat}\n`;
		files.forEach(f => {
			result += `- \`${f}\`\n`;
		});
		result += '\n';
	}

	if (catCount === 0) {
		result += `*No documentation found in docs/ directory.*\n\n`;
		result += `Use \`create_doc\` to add application documentation.`;
	}

	return {
		content: [{ type: 'text', text: result }],
	};
}

/**
 * Handler map
 */
export const handlers = {
	create_doc: createDoc,
	update_doc: updateDoc,
	add_release_note: addReleaseNote,
	update_architecture_doc: updateArchitectureDoc,
	list_doc_categories: listDocCategories,
};
