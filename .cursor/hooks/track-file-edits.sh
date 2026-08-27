#!/bin/bash

# =============================================================================
# Project-MCP File Edit Tracker
# =============================================================================
#
# Hook: afterFileEdit
# Trigger: After user accepts file changes from the agent
#
# Purpose: Tracks file edits to a temp file so the stop hook knows when
# actual changes were made (vs just conversation).
#
# This enables smart documentation suggestions - only prompt for docs
# when code was actually changed.
#
# =============================================================================

# Read JSON input from stdin
input=$(cat)

# Parse the file path from the edit
file_path=$(echo "$input" | jq -r '.file_path // ""')
conversation_id=$(echo "$input" | jq -r '.conversation_id // "unknown"')

# Skip if no file path
if [ -z "$file_path" ]; then
    exit 0
fi

# Log file location (per-conversation to avoid cross-talk)
pending_edits_file="/tmp/project-mcp-pending-edits-${conversation_id}.txt"
log_file="/tmp/project-mcp-edit-tracker.log"

# Get timestamp
timestamp=$(date '+%Y-%m-%d %H:%M:%S')

# Log for debugging
echo "[$timestamp] File edited: $file_path (conversation: $conversation_id)" >> "$log_file"

# Append the file path to the pending edits list
# This file will be checked by the stop hook
echo "$file_path" >> "$pending_edits_file"

# No output needed - this is a tracking hook
exit 0
