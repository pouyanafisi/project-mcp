/**
 * Comprehensive tests for prompts and tool validation.
 *
 * These tests ensure:
 * 1. All prompt names follow snake_case convention
 * 2. Every prompt has a message handler
 * 3. Every tool referenced in prompts actually exists
 * 4. No orphan handlers (handlers without prompts)
 * 5. promptToolMapping is accurate and complete
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { prompts, promptToolMapping, getPromptNames, getToolsForPrompt } from '../src/prompts/definitions.js';
import { getMessageHandlerKeys } from '../src/prompts/index.js';
import { definitions as toolDefinitions, hasHandler } from '../src/tools/index.js';

// Get all tool names from definitions
const allToolNames = toolDefinitions.map((t) => t.name);

describe('Prompt naming conventions', () => {
	test('all prompt names use snake_case', () => {
		const snakeCaseRegex = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;

		for (const prompt of prompts) {
			assert.ok(
				snakeCaseRegex.test(prompt.name),
				`Prompt "${prompt.name}" should use snake_case. Got: ${prompt.name}`
			);
		}
	});

	test('no hyphenated prompt names', () => {
		for (const prompt of prompts) {
			assert.ok(
				!prompt.name.includes('-'),
				`Prompt "${prompt.name}" should not contain hyphens. Use snake_case instead.`
			);
		}
	});

	test('prompt argument names use snake_case', () => {
		const snakeCaseRegex = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;

		for (const prompt of prompts) {
			for (const arg of prompt.arguments || []) {
				assert.ok(
					snakeCaseRegex.test(arg.name),
					`Prompt "${prompt.name}" argument "${arg.name}" should use snake_case`
				);
			}
		}
	});
});

describe('Prompt-handler consistency', () => {
	test('every prompt has a message handler', () => {
		const handlerKeys = getMessageHandlerKeys();
		const promptNames = getPromptNames();

		for (const promptName of promptNames) {
			assert.ok(
				handlerKeys.includes(promptName),
				`Prompt "${promptName}" is missing a message handler in index.js`
			);
		}
	});

	test('every message handler has a prompt definition', () => {
		const handlerKeys = getMessageHandlerKeys();
		const promptNames = getPromptNames();

		for (const handlerKey of handlerKeys) {
			assert.ok(
				promptNames.includes(handlerKey),
				`Message handler "${handlerKey}" has no matching prompt definition`
			);
		}
	});

	test('prompt and handler counts match', () => {
		const handlerKeys = getMessageHandlerKeys();
		const promptNames = getPromptNames();

		assert.strictEqual(
			promptNames.length,
			handlerKeys.length,
			`Prompt count (${promptNames.length}) should match handler count (${handlerKeys.length})`
		);
	});
});

describe('Tool references validation', () => {
	test('all tools in promptToolMapping exist', () => {
		for (const [promptName, tools] of Object.entries(promptToolMapping)) {
			for (const toolName of tools) {
				assert.ok(
					allToolNames.includes(toolName),
					`Prompt "${promptName}" references non-existent tool "${toolName}". Available tools: ${allToolNames.join(', ')}`
				);
			}
		}
	});

	test('all tools in promptToolMapping have handlers', () => {
		for (const [promptName, tools] of Object.entries(promptToolMapping)) {
			for (const toolName of tools) {
				assert.ok(
					hasHandler(toolName),
					`Prompt "${promptName}" references tool "${toolName}" which has no handler`
				);
			}
		}
	});

	test('every prompt has a tool mapping entry', () => {
		const promptNames = getPromptNames();

		for (const promptName of promptNames) {
			assert.ok(
				promptName in promptToolMapping,
				`Prompt "${promptName}" is missing from promptToolMapping`
			);
		}
	});

	test('every promptToolMapping key has a prompt', () => {
		const promptNames = getPromptNames();

		for (const mappingKey of Object.keys(promptToolMapping)) {
			assert.ok(
				promptNames.includes(mappingKey),
				`promptToolMapping key "${mappingKey}" has no matching prompt`
			);
		}
	});

	test('no empty tool mappings', () => {
		for (const [promptName, tools] of Object.entries(promptToolMapping)) {
			assert.ok(
				Array.isArray(tools) && tools.length > 0,
				`Prompt "${promptName}" should map to at least one tool`
			);
		}
	});
});

describe('Prompt definitions completeness', () => {
	test('all prompts have descriptions', () => {
		for (const prompt of prompts) {
			assert.ok(
				prompt.description && prompt.description.length > 10,
				`Prompt "${prompt.name}" should have a meaningful description`
			);
		}
	});

	test('all prompts have arguments array (even if empty)', () => {
		for (const prompt of prompts) {
			assert.ok(
				Array.isArray(prompt.arguments),
				`Prompt "${prompt.name}" should have an arguments array`
			);
		}
	});

	test('required arguments have descriptions', () => {
		for (const prompt of prompts) {
			for (const arg of prompt.arguments || []) {
				if (arg.required) {
					assert.ok(
						arg.description && arg.description.length > 0,
						`Required argument "${arg.name}" in prompt "${prompt.name}" should have a description`
					);
				}
			}
		}
	});
});

describe('Tool definitions completeness', () => {
	test('all tools have unique names', () => {
		const names = new Set();
		for (const tool of toolDefinitions) {
			assert.ok(
				!names.has(tool.name),
				`Duplicate tool name: "${tool.name}"`
			);
			names.add(tool.name);
		}
	});

	test('all tools have descriptions', () => {
		for (const tool of toolDefinitions) {
			assert.ok(
				tool.description && tool.description.length > 10,
				`Tool "${tool.name}" should have a meaningful description`
			);
		}
	});

	test('all tools have handlers', () => {
		for (const tool of toolDefinitions) {
			assert.ok(
				hasHandler(tool.name),
				`Tool "${tool.name}" is defined but has no handler`
			);
		}
	});

	test('tool names use snake_case', () => {
		const snakeCaseRegex = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;

		for (const tool of toolDefinitions) {
			assert.ok(
				snakeCaseRegex.test(tool.name),
				`Tool "${tool.name}" should use snake_case`
			);
		}
	});
});

describe('Integration sanity checks', () => {
	test('expected number of prompts exist', () => {
		assert.ok(
			prompts.length >= 8,
			`Expected at least 8 prompts, got ${prompts.length}`
		);
	});

	test('expected number of tools exist', () => {
		assert.ok(
			toolDefinitions.length >= 20,
			`Expected at least 20 tools, got ${toolDefinitions.length}`
		);
	});

	test('core prompts exist', () => {
		const corePrompts = [
			'project_overview',
			'get_next_task',
			'init_project',
			'import_tasks',
			'list_tasks',
			'update_task',
		];

		const promptNames = getPromptNames();
		for (const core of corePrompts) {
			assert.ok(
				promptNames.includes(core),
				`Core prompt "${core}" is missing`
			);
		}
	});

	test('core tools exist', () => {
		const coreTools = [
			'search_project',
			'list_tasks',
			'create_task',
			'update_task',
			'init_project',
			'import_tasks',
			'promote_task',
			'archive_task',
		];

		for (const core of coreTools) {
			assert.ok(
				allToolNames.includes(core),
				`Core tool "${core}" is missing`
			);
		}
	});
});

