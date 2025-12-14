#!/bin/bash
# Script to import existing Vercel project into Terraform state
# This should be run before terraform apply if the project already exists
#
# Usage:
#   ./import-project.sh [project-name] [project-id]
#   ./import-project.sh parceltrack-frontend prj_cn8sVCze03jFSGXG1y9ea5Vmwq0E

set -e

PROJECT_NAME="${1:-parceltrack-frontend}"
PROJECT_ID="${2:-prj_cn8sVCze03jFSGXG1y9ea5Vmwq0E}"

echo "Attempting to import Vercel project: $PROJECT_NAME (ID: $PROJECT_ID)"

# Initialize Terraform if needed
if [ ! -d ".terraform" ]; then
    echo "Initializing Terraform..."
    terraform init -input=false > /dev/null 2>&1 || terraform init -input=false
fi

# Check if project is already in state
if terraform state show vercel_project.parceltrack_frontend > /dev/null 2>&1; then
    echo "✓ Project already in Terraform state, skipping import."
    exit 0
fi

# Try to import the project (ignore errors if import fails)
echo "Importing project into Terraform state..."
if terraform import vercel_project.parceltrack_frontend "$PROJECT_ID" 2>&1; then
    echo "✓ Successfully imported project: $PROJECT_NAME"
    exit 0
else
    echo "⚠ Import failed. This is OK if:"
    echo "  - The project doesn't exist yet (Terraform will create it)"
    echo "  - The project ID is incorrect"
    echo "  - You don't have permission to access the project"
    echo ""
    echo "Terraform will attempt to create the project on the next apply."
    # Don't fail the script - let Terraform handle the creation
    exit 0
fi

