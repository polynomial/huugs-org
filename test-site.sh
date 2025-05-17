#!/bin/bash

# Test script for photo gallery website
echo "Starting Photo Gallery Website Test"
echo "=================================="

# Display help information
show_help() {
    echo "Usage: ./test-site.sh [options]"
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

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed. Please install Node.js to run this test."
    exit 1
fi

# Check if http-server is installed
if ! npm list -g http-server &> /dev/null; then
    echo "ℹ️ Installing http-server for testing..."
    npm install -g http-server
fi

# Run the test script
echo "ℹ️ Running tests..."
node test-site.js
TEST_EXIT_CODE=$?

# Run the fix script if auto fix is enabled
if [ "$AUTO_FIX" = true ]; then
    echo ""
    echo "ℹ️ Automatically fixing detected issues..."
    node fix-issues.js
    FIX_EXIT_CODE=$?
    
    if [ $FIX_EXIT_CODE -eq 0 ]; then
        echo ""
        echo "ℹ️ Re-running tests to verify fixes..."
        node test-site.js
        TEST_EXIT_CODE=$?
    else
        echo "❌ Fix script failed with exit code: $FIX_EXIT_CODE"
        exit $FIX_EXIT_CODE
    fi
fi

# Exit with the same code as the test script
exit $TEST_EXIT_CODE 