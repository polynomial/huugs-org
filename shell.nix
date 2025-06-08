{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs_20
    python3
  ] ++ pkgs.lib.optionals pkgs.stdenv.isLinux [
    chromium  # For Puppeteer (Linux only)
  ];
  
  shellHook = ''
    echo "🏃 Track Gallery Development Environment"
    echo "Node.js: $(node --version)"
    echo "Python: $(python3 --version)"
    echo ""
    
    # Install npm dependencies if needed
    if [ ! -d "node_modules" ] || [ ! -d "node_modules/puppeteer" ]; then
      echo "📦 Installing npm dependencies..."
      npm install
    fi
    
    # Set Puppeteer to use system Chrome/Chromium if available
    export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
    
    # Try to find Chrome/Chromium on the system
    if command -v chromium >/dev/null 2>&1; then
      export PUPPETEER_EXECUTABLE_PATH=$(which chromium)
      echo "🌐 Using Chromium for enhanced scraping"
    elif command -v google-chrome >/dev/null 2>&1; then
      export PUPPETEER_EXECUTABLE_PATH=$(which google-chrome)
      echo "🌐 Using Google Chrome for enhanced scraping"
    elif command -v "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" >/dev/null 2>&1; then
      export PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      echo "🌐 Using macOS Google Chrome for enhanced scraping"
    else
      echo "⚠️  No Chrome/Chromium found, will use fallback scraping method"
      unset PUPPETEER_EXECUTABLE_PATH
    fi
    
    echo "Available commands:"
    echo "  node scripts/generate-track-gallery.js  # Generate track gallery"
    echo "  python3 -m http.server 3000             # Start test server"
    echo ""
  '';
} 