import { test } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

test('package.json is valid', async () => {
	const packageJson = JSON.parse(await readFile(join(PROJECT_ROOT, 'package.json'), 'utf-8'));
	
	assert.ok(packageJson.name, 'Package name is required');
	assert.ok(packageJson.version, 'Package version is required');
	assert.ok(packageJson.description, 'Package description is required');
	assert.ok(packageJson.license, 'Package license is required');
	assert.ok(packageJson.main, 'Package main entry point is required');
	assert.ok(packageJson.bin, 'Package bin entry is required');
});

test('index.js exists and is executable', async () => {
	const indexPath = join(PROJECT_ROOT, 'index.js');
	const content = await readFile(indexPath, 'utf-8');
	
	assert.ok(content.includes('ProjectMCPServer'), 'Should contain ProjectMCPServer class');
	assert.ok(content.includes('search_project'), 'Should contain search_project tool');
	assert.ok(content.includes('search_docs'), 'Should contain search_docs tool');
});

test('README.md exists', async () => {
	const readmePath = join(PROJECT_ROOT, 'README.md');
	const content = await readFile(readmePath, 'utf-8');
	
	assert.ok(content.includes('Project MCP'), 'Should mention Project MCP');
	assert.ok(content.includes('Installation') || content.includes('npm install'), 'Should include installation instructions');
});

test('LICENSE exists', async () => {
	const licensePath = join(PROJECT_ROOT, 'LICENSE');
	const content = await readFile(licensePath, 'utf-8');
	
	assert.ok(content.includes('MIT'), 'Should be MIT license');
});

