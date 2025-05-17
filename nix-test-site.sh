#!/bin/bash

# Nix-aware test script for photo gallery website
echo "Starting Photo Gallery Website Test (Nix-aware)"
echo "=============================================="

# Display help information
show_help() {
    echo "Usage: ./nix-test-site.sh [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -f, --fix      Automatically fix detected issues after testing"
    echo ""
    exit 0
}

# Parse command line options
AUTO_FIX=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            show_help
            ;;
        -f|--fix)
            AUTO_FIX=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            ;;
    esac
done

# Use nix-shell to run Node.js commands
run_in_nix() {
    nix-shell -p nodejs_18 --run "$1"
}

echo "⚙️ Running in Nix environment - adapting tests accordingly"

# Run the test script
echo "ℹ️ Running tests..."
run_in_nix "node test-site.js"
TEST_EXIT_CODE=$?

# Run the fix script if auto fix is enabled
if [ "$AUTO_FIX" = true ]; then
    echo ""
    echo "ℹ️ Automatically fixing detected issues..."
    run_in_nix "node fix-issues.js"
    FIX_EXIT_CODE=$?
    
    if [ $FIX_EXIT_CODE -eq 0 ]; then
        echo ""
        echo "ℹ️ Re-running tests to verify fixes..."
        run_in_nix "node test-site.js"
        TEST_EXIT_CODE=$?
    else
        echo "❌ Fix script failed with exit code: $FIX_EXIT_CODE"
        exit $FIX_EXIT_CODE
    fi
fi

# Exit with the same code as the test script
exit $TEST_EXIT_CODE 