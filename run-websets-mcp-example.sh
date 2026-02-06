#!/bin/bash
# Wrapper script to run the Websets MCP server with EXA_API_KEY from Google Cloud Secret Manager

set -e

PROJECT_ID="google-cloud-project-name"
SECRET_NAME="EXA_API_KEY"

# Fetch the API key from Secret Manager
export EXA_API_KEY=$(gcloud secrets versions access latest --secret="$SECRET_NAME" --project="$PROJECT_ID" 2>/dev/null)

if [ -z "$EXA_API_KEY" ]; then
    echo "Error: Failed to fetch EXA_API_KEY from Secret Manager" >&2
    echo "Make sure you're authenticated with gcloud and have access to the secret." >&2
    exit 1
fi

# Run the MCP server
exec npx -y websets-mcp-server "$@"
