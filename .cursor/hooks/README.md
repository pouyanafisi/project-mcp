# Project-MCP Cursor Hooks

This directory contains [Cursor Hooks](https://docs.cursor.com/advanced/hooks) that extend the Cursor AI agent behavior for projects using the project-mcp server.

## Overview

Cursor Hooks allow us to observe, control, and extend the agent loop using custom scripts. Our hooks implement a **documentation hygiene workflow** that ensures project documentation stays up-to-date as changes are made.

## Hooks Configuration

The hooks are configured in `.cursor/hooks.json`:

```json
{
  "version": 1,
  "hooks": {
    "stop": [{ "command": "./.cursor/hooks/suggest-docs-update.sh" }],
    "beforeMCPExecution": [{ "command": "./.cursor/hooks/confirm-project-mcp.sh" }]
  }
}
```

## Available Hooks

### 1. `confirm-project-mcp.sh` (beforeMCPExecution hook) ✅ ACTIVE

**Trigger:** Before any MCP tool execution

**Purpose:** Shows a UI confirmation dialog when the agent tries to modify project documentation using project-mcp tools.

**Behavior by Tool Type:**

| Tool Type | Examples | Permission |
|-----------|----------|------------|
| **Read-only** | `search_project`, `get_doc`, `list_tasks` | Auto-allow |
| **Write** | `update_project_status`, `add_decision`, `create_task` | Ask user |

**User Experience:**
- Read-only tools execute silently
- Write tools show a confirmation dialog with Allow/Deny buttons
- User sees a clear description of what the tool will do

### 2. `audit.sh` (optional)

**Purpose:** Logs all hook events for debugging and monitoring.

**Usage:** Add to any hook event in `hooks.json` for auditing:
```json
"afterShellExecution": [{ "command": "./.cursor/hooks/audit.sh" }]
```

**Log Location:** `/tmp/project-mcp-hooks-audit.log`

### 3. `suggest-docs-update.sh` ⚠️ DEPRECATED - DO NOT USE

**Status:** DISABLED due to infinite loop issue

**Problem:** The `stop` hook fires after EVERY agent response, not just at the end of a conversation. Even with `loop_count` checks, this creates an annoying repetitive cycle where the agent keeps asking about documentation.

**Why it failed:**
1. Agent completes task → stop hook fires → sends followup message
2. Agent responds to followup → stop hook fires again
3. Even though loop_count increments, the agent keeps responding to its own messages

**Alternative:** Use `beforeMCPExecution` hook (confirm-project-mcp.sh) which provides UI confirmation without automatic triggering. Ask the agent manually to update documentation when needed.

## User Workflow

When working with an agent, the documentation update flow looks like:

```
1. User asks agent to implement a feature
         ↓
2. Agent completes the work
         ↓
3. Agent asks: "Would you like me to review documentation?"
         ↓
4. User says "yes"
         ↓
5. Agent searches project docs (auto-allowed)
         ↓
6. Agent tries to update STATUS.md
         ↓
7. User sees: "📝 Documentation Update: update project status?"
         ↓
8. User clicks [Allow] → Documentation updated
   User clicks [Deny] → No changes made
```

## Project-MCP Integration

These hooks work with the [project-mcp](https://www.npmjs.com/package/project-mcp) server configured in `.mcp.json`. The project-mcp server provides tools for:

### Project Management (`.project/` directory)
- **Search:** `search_project`, `get_doc`
- **Status:** `update_project_status`, `create_or_update_status`
- **Decisions:** `add_decision`, `create_or_update_decisions`
- **Tasks:** `create_task`, `update_task`, `promote_task`
- **Roadmap:** `add_roadmap_milestone`, `create_or_update_roadmap`

### Documentation (`docs/` directory)
- **Search:** `search_docs`, `list_docs`
- **Update:** `update_doc`, `create_doc`

## Log Files

| Log File | Purpose |
|----------|---------|
| `/tmp/project-mcp-docs-hook.log` | stop hook activity |
| `/tmp/project-mcp-confirm-hook.log` | MCP execution confirmations |
| `/tmp/project-mcp-hooks-audit.log` | Full audit trail (if enabled) |

## Troubleshooting

### Hooks not working?

1. **Restart Cursor** to reload hooks configuration
2. Check that scripts are executable: `chmod +x .cursor/hooks/*.sh`
3. Verify `jq` is installed: `which jq`
4. Check log files for errors

### Viewing hook activity

```bash
# Watch the stop hook log
tail -f /tmp/project-mcp-docs-hook.log

# Watch the MCP confirmation log
tail -f /tmp/project-mcp-confirm-hook.log
```

### Testing hooks manually

```bash
# Test the stop hook
echo '{"status":"completed","loop_count":0}' | ./.cursor/hooks/suggest-docs-update.sh

# Test the MCP hook with a write tool
echo '{"tool_name":"update_project_status"}' | ./.cursor/hooks/confirm-project-mcp.sh

# Test the MCP hook with a read tool
echo '{"tool_name":"search_project"}' | ./.cursor/hooks/confirm-project-mcp.sh
```

## Configuration Options

### Disabling documentation suggestions

To disable the automatic documentation update suggestion, comment out or remove the stop hook in `hooks.json`:

```json
{
  "version": 1,
  "hooks": {
    // "stop": [{ "command": "./.cursor/hooks/suggest-docs-update.sh" }],
    "beforeMCPExecution": [{ "command": "./.cursor/hooks/confirm-project-mcp.sh" }]
  }
}
```

### Auto-allowing all project-mcp tools

To remove the confirmation requirement (not recommended), change the `confirm-project-mcp.sh` to always return `"permission": "allow"`.

## Security Considerations

- Write operations to project documentation require explicit user approval
- Read operations are auto-allowed as they don't modify files
- All hook activity can be audited via the audit.sh script
- Hooks run in the project's trusted workspace context

## Dependencies

- **jq** - JSON processor for parsing hook inputs (`brew install jq`)
- **bash** - Shell interpreter for hook scripts
