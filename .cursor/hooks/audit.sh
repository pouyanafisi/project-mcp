#!/bin/bash

# =============================================================================
# Project-MCP Hook Audit Logger
# =============================================================================
#
# This script logs all hook events to /tmp/project-mcp-hooks-audit.log
# for debugging and monitoring purposes.
#
# To enable auditing for any hook event, add this script to the hooks.json:
#
#   "afterShellExecution": [{ "command": "./.cursor/hooks/audit.sh" }]
#
# =============================================================================

# Read JSON input from stdin
json_input=$(cat)

# Create timestamp for the log entry
timestamp=$(date '+%Y-%m-%d %H:%M:%S')

# Create the log file path
log_file="/tmp/project-mcp-hooks-audit.log"

# Extract key fields for summary
hook_event=$(echo "$json_input" | jq -r '.hook_event_name // "unknown"')
conversation_id=$(echo "$json_input" | jq -r '.conversation_id // "unknown"')

# Write the timestamped JSON entry to the audit log
echo "" >> "$log_file"
echo "===== [$timestamp] =====" >> "$log_file"
echo "Event: $hook_event" >> "$log_file"
echo "Conversation: $conversation_id" >> "$log_file"
echo "Full Input:" >> "$log_file"
echo "$json_input" | jq '.' >> "$log_file"

# Exit successfully (don't block any operations)
exit 0
