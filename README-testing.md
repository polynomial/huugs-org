# Photo Gallery Website Testing Tools

This directory contains tools to test and fix common issues with the photo gallery website.

## Tools Overview

- `test-site.js`: A Node.js script that tests various aspects of the website, including:
  - Required files existence
  - CSS validation
  - JavaScript syntax errors
  - HTML structure validation
  - Image loading
  - Gallery configuration validation
  - Accessibility basics
  - HTTP resource availability

- `fix-issues.js`: A Node.js script that automatically fixes common issues, including:
  - Creating necessary directories
  - Adding vendor prefixes to CSS properties
  - Replacing console.log statements with a debug utility
  - Fixing gallery configuration JSON
  - Adding event listener cleanup to prevent memory leaks
  - Configuring lazy loading
  - Creating a default favicon if missing

- `test-site.sh`: A shell script wrapper that makes it easy to run tests and fixes.

## Requirements

- Node.js (v14+)
- npm

## Usage

### Running Tests

To test your website:

```bash
./test-site.sh
```

This will check your website for common issues and display the results, including:

- ✅ Passed tests
- ⚠️ Warnings
- ❌ Failed tests

### Automatically Fixing Issues

To test your website and automatically fix detected issues:

```bash
./test-site.sh --fix
```

This will:
1. Run the tests to identify issues
2. Apply automatic fixes for common problems
3. Run the tests again to verify that the fixes were successful

### Options

```
Usage: ./test-site.sh [options]

Options:
  -h, --help     Show this help message
  -f, --fix      Automatically fix detected issues after testing
```

## Running Tests Manually

If you prefer to run the tests without the shell script:

```bash
node test-site.js
```

And to run the fixes manually:

```bash
node fix-issues.js
```

## What's Being Tested

1. **File Structure**
   - Essential files like index.html, CSS, JavaScript
   - Proper directory structure

2. **CSS Validation**
   - Basic validation of CSS files
   - Vendor prefix recommendations

3. **JavaScript Checks**
   - Syntax errors in JS files
   - Console statements that should be removed in production

4. **HTML Structure**
   - Basic HTML validation
   - Meta tags for viewport, description, etc.

5. **Image Loading**
   - Image availability
   - Lazy loading implementation

6. **Gallery Configuration**
   - JSON validation
   - Required gallery fields

7. **Accessibility Basics**
   - Alt text for images
   - ARIA attributes

8. **HTTP Resources**
   - Tests HTTP access to key resources

## What's Being Fixed

1. **Directory Structure**
   - Creates missing directories

2. **CSS Prefixes**
   - Adds vendor prefixes to CSS properties that need them

3. **JavaScript Improvements**
   - Replaces console.log statements with a DEBUG-controlled function
   - Adds event listener cleanup to prevent memory leaks

4. **Gallery Configuration**
   - Fixes JSON syntax errors
   - Creates a sample config if missing

5. **Lazy Loading**
   - Adds vanilla-lazyload library if missing

6. **Favicon**
   - Creates a default favicon if missing

## Extending the Tests

To add more tests or fixes, modify the respective JavaScript files:

- Add new test functions to `test-site.js`
- Add new fix functions to `fix-issues.js`

## Troubleshooting

If you encounter any issues:

1. Make sure Node.js is installed and up to date
2. Check that you're running the scripts from the root directory of your website
3. Examine any error messages for specific file paths or issues to address

If automatic fixes don't resolve all issues, you may need to make manual adjustments based on the test output. 