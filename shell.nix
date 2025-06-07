{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs_20
    python3
  ];
  
  shellHook = ''
    echo "🏃 Track Gallery Development Environment"
    echo "Node.js: $(node --version)"
    echo "Python: $(python3 --version)"
    echo ""
    echo "Available commands:"
    echo "  node scripts/generate-track-gallery.js  # Generate track gallery"
    echo "  python3 -m http.server 3000             # Start test server"
    echo ""
  '';
} 