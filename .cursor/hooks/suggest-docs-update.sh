#!/bin/bash

# =============================================================================
# Project-MCP Documentation Update Hook (stop event)
# =============================================================================
#
# Trigger: When the agent completes a task
# Purpose: Automatically trigger documentation review via project-mcp
#
# Flow:
# 1. Agent completes task → stop hook fires (loop_count=0)
# 2. Hook returns a DIRECT INSTRUCTION (not a question) as followup_message
# 3. Agent attempts to use project-mcp tools
# 4. beforeMCPExecution hook shows UI confirmation button
# 5. User clicks Allow → docs updated, OR Deny → skipped
# 6. Agent completes → stop hook fires (loop_count=1) → returns {} (no loop)
#
# Key insight: The followup is an INSTRUCTION, not a question.
# User confirmation happens via the beforeMCPExecution hook UI button.
#
# =============================================================================

# Read JSON input from stdin
input=$(cat)

# Parse fields from the JSON input
status=$(echo "$input" | jq -r '.status // "unknown"')
loop_count=$(echo "$input" | jq -r '.loop_count // 0')
conversation_id=$(echo "$input" | jq -r '.conversation_id // "unknown"')

# Log for debugging
log_file="/tmp/project-mcp-docs-hook.log"
timestamp=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$timestamp] stop hook - status: $status, loop_count: $loop_count, conv: $conversation_id" >> "$log_file"

# Only trigger on:
# 1. Successful completion (not aborted or error)
# 2. First stop in this conversation (loop_count = 0)
if [ "$status" = "completed" ] && [ "$loop_count" -eq 0 ]; then
    echo "[$timestamp] Triggering documentation review" >> "$log_file"
    
    # Return a DIRECT INSTRUCTION as the followup message
    # This gets auto-submitted as a user message
    # The agent will try to use project-mcp tools
    # The beforeMCPExecution hook will show the UI confirmation button
    cat << 'EOF'
{
  "followup_message": "Now check if any project documentation needs to be updated based on the changes we just made. Use the project-mcp server to update .project/STATUS.md with what was accomplished. If we made architectural decisions, add them to .project/DECISIONS.md. If we completed tasks, update .project/TODO.md accordingly. For significant application documentation changes, consider updating docs/ as well. Only update what's relevant - skip if no documentation changes are needed."
}
EOF
else
    # For aborted/error states, or subsequent loops (loop_count > 0), do nothing
    echo "[$timestamp] Skipping (status=$status, loop_count=$loop_count)" >> "$log_file"
    echo '{}'
fi

exit 0
