#!/bin/bash

# Run the photo gallery auto-test in a Nix environment
echo "Running Photo Gallery Auto-Test in Nix Environment"
echo "================================================="

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "Node.js is required. Using nix-shell to provide it."
    EXEC_CMD="nix-shell -p nodejs_18"
else
    EXEC_CMD=""
fi

# Install dependencies explicitly
echo "Installing test dependencies..."

# Create a temporary directory for the test
TEST_DIR="./test-gallery-run"
mkdir -p "$TEST_DIR"

# Copy files to test directory
cp auto-test.js test-package.json "$TEST_DIR/"
cp -r js css "$TEST_DIR/" 2>/dev/null || true
cp generate-galleries.js index.html favicon.svg "$TEST_DIR/" 2>/dev/null || true

# Setup package.json in test directory
cd "$TEST_DIR"
mv test-package.json package.json

# Install dependencies
if [ -n "$EXEC_CMD" ]; then
    $EXEC_CMD --run "npm install --no-fund --no-audit"
else
    npm install --no-fund --no-audit
fi

# Make auto-test.js executable
chmod +x auto-test.js

# Run the test script
echo "Running test script..."
if [ -n "$EXEC_CMD" ]; then
    $EXEC_CMD --run "node auto-test.js"
else
    node auto-test.js
fi

# Return to original directory
cd .. 