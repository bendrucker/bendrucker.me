#!/usr/bin/env bash

# JavaScript/TypeScript linting hook for Write, Edit, and MultiEdit operations
# Runs ESLint and Prettier on changed JS/TS files (.js, .mjs, .cjs, .ts, .astro)

set -euo pipefail

# Read tool information from stdin
input=$(cat)

# Extract tool name and inputs
tool_name=$(echo "$input" | jq -r '.tool_name')
cwd=$(echo "$input" | jq -r '.cwd')

# Change to the project directory
cd "$cwd"

# Function to process a single file
process_file() {
    local file_path="$1"
    
    # Skip if file doesn't exist
    if [[ ! -f "$file_path" ]]; then
        return 0
    fi
    
    echo "🔍 Checking file: $file_path"
    
    # Run ESLint
    if npx eslint "$file_path" --no-fix 2>&1; then
        echo "✅ ESLint: No issues found"
    else
        echo "❌ ESLint: Issues found (see above)"
    fi
    
    # Run Prettier check
    if npx prettier --check "$file_path" 2>&1; then
        echo "✅ Prettier: Formatting is correct"
    else
        echo "❌ Prettier: Formatting issues found"
        echo "💡 Run 'npx prettier --write \"$file_path\"' to fix formatting"
    fi
    
    echo "---"
}

# Extract file paths based on tool type and normalize into array
declare -a file_paths=()
case "$tool_name" in
    "Write"|"Edit"|"MultiEdit")
        # All three tools use a single file_path parameter
        file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')
        if [[ -n "$file_path" ]]; then
            file_paths+=("$file_path")
        fi
        ;;
        
    *)
        echo "Unknown tool: $tool_name"
        exit 0
        ;;
esac

# Filter array to only JS/TS/Astro files
declare -a js_ts_files=()
for file in "${file_paths[@]}"; do
    if [[ "$file" =~ \.(js|mjs|cjs|ts|astro)$ ]]; then
        js_ts_files+=("$file")
    fi
done

# Process each JS/TS/Astro file
if [[ ${#js_ts_files[@]} -eq 0 ]]; then
    echo "No JS/TS/Astro files to check"
    exit 0
fi

for file in "${js_ts_files[@]}"; do
    process_file "$file"
done

echo "🎉 JavaScript/TypeScript linting complete!"
