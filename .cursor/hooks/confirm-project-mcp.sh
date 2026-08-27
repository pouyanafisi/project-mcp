#!/bin/bash

# =============================================================================
# Project-MCP Confirmation Hook
# =============================================================================
#
# This hook intercepts MCP tool executions and requires user confirmation
# for project-mcp tools that modify documentation.
#
# It implements the "UI button" functionality by returning permission: "ask"
# which shows a confirmation dialog to the user before the tool executes.
#
# Tool Categories:
# - WRITE tools (require confirmation): manage_project_file, create_*, update_*
# - READ tools (auto-allow): search_*, get_*, list_*, check_*
#
# =============================================================================

# Read JSON input from stdin
input=$(cat)

# Parse fields from the JSON input
tool_name=$(echo "$input" | jq -r '.tool_name // ""')
tool_input=$(echo "$input" | jq -r '.tool_input // "{}"')

# Check if this is the project-mcp server
# We look for project-mcp specific tools
is_project_mcp=false

# List of project-mcp tools (based on the project-mcp package)
project_mcp_tools=(
    # Search/Read tools (these are safe, auto-allow)
    "search_project"
    "search_docs"
    "get_doc"
    "list_docs"
    "get_doc_structure"
    "check_project_state"
    "get_decision"
    "list_decisions"
    "get_roadmap"
    "get_task"
    "list_tasks"
    "search_tasks"
    "get_next_task"
    "get_backlog"
    "list_archived_tasks"
    "list_thoughts"
    "list_archived_thoughts"
    "get_thought"
    
    # Write/Modify tools (these require confirmation)
    "manage_project_file"
    "create_or_update_roadmap"
    "create_or_update_todo"
    "create_or_update_status"
    "create_or_update_index"
    "create_or_update_decisions"
    "add_decision"
    "update_project_status"
    "add_roadmap_milestone"
    "create_task"
    "update_task"
    "delete_task"
    "promote_task"
    "archive_task"
    "unarchive_task"
    "add_to_backlog"
    "update_backlog_item"
    "remove_from_backlog"
    "import_tasks"
    "sync_todo_index"
    "process_thoughts"
    "archive_thought"
    "init_project"
    "lint_project_docs"
    
    # Documentation tools (docs/ directory)
    "create_doc"
    "update_doc"
    "add_release_note"
    "update_architecture_doc"
)

# Check if the tool is a project-mcp tool
for tool in "${project_mcp_tools[@]}"; do
    if [ "$tool_name" = "$tool" ]; then
        is_project_mcp=true
        break
    fi
done

# Log for debugging
log_file="/tmp/project-mcp-confirm-hook.log"
timestamp=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$timestamp] beforeMCPExecution - tool: $tool_name, is_project_mcp: $is_project_mcp" >> "$log_file"

# If not a project-mcp tool, allow without prompting
if [ "$is_project_mcp" = false ]; then
    cat << EOF
{
  "permission": "allow"
}
EOF
    exit 0
fi

# Define read-only tools that can be auto-allowed
read_only_tools=(
    "search_project"
    "search_docs"
    "get_doc"
    "list_docs"
    "get_doc_structure"
    "check_project_state"
    "get_decision"
    "list_decisions"
    "get_roadmap"
    "get_task"
    "list_tasks"
    "search_tasks"
    "get_next_task"
    "get_backlog"
    "list_archived_tasks"
    "list_thoughts"
    "list_archived_thoughts"
    "get_thought"
)

# Check if this is a read-only tool
is_read_only=false
for tool in "${read_only_tools[@]}"; do
    if [ "$tool_name" = "$tool" ]; then
        is_read_only=true
        break
    fi
done

# Read-only tools can execute without confirmation
if [ "$is_read_only" = true ]; then
    echo "[$timestamp] Auto-allowing read-only tool: $tool_name" >> "$log_file"
    cat << EOF
{
  "permission": "allow"
}
EOF
    exit 0
fi

# For write tools, require user confirmation with a clear message
echo "[$timestamp] Requiring confirmation for write tool: $tool_name" >> "$log_file"

# Create a user-friendly description of what the tool will do
case "$tool_name" in
    "manage_project_file")
        action_desc="update a project management file (.project/)"
        ;;
    "create_or_update_roadmap")
        action_desc="update the project roadmap (.project/ROADMAP.md)"
        ;;
    "create_or_update_todo")
        action_desc="update the TODO list (.project/TODO.md)"
        ;;
    "create_or_update_status")
        action_desc="update the project status (.project/STATUS.md)"
        ;;
    "create_or_update_decisions")
        action_desc="add/update project decisions (.project/DECISIONS.md)"
        ;;
    "add_decision")
        action_desc="add a new architecture decision record (.project/DECISIONS.md)"
        ;;
    "update_project_status")
        action_desc="update the project health status (.project/STATUS.md)"
        ;;
    "create_task"|"update_task"|"delete_task")
        action_desc="modify project tasks (.project/todos/)"
        ;;
    "promote_task"|"archive_task"|"unarchive_task")
        action_desc="change task status (.project/todos/)"
        ;;
    "add_to_backlog"|"update_backlog_item"|"remove_from_backlog")
        action_desc="modify the project backlog (.project/BACKLOG.md)"
        ;;
    "import_tasks")
        action_desc="import tasks from a document"
        ;;
    "sync_todo_index")
        action_desc="synchronize the TODO dashboard"
        ;;
    "create_doc"|"update_doc")
        action_desc="modify application documentation (docs/)"
        ;;
    "add_release_note")
        action_desc="add a release note (docs/releases/)"
        ;;
    "update_architecture_doc")
        action_desc="update architecture documentation (docs/)"
        ;;
    *)
        action_desc="modify project documentation"
        ;;
esac

# Return ask permission with informative messages
cat << EOF
{
  "permission": "ask",
  "user_message": "📝 Documentation Update: The agent wants to $action_desc using the project-mcp server.",
  "agent_message": "The user will be prompted to approve this documentation update. If denied, please inform the user that no changes were made to the documentation."
}
EOF

exit 0
