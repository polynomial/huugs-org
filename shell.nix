{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  name = "photo-gallery-test-env";
  buildInputs = with pkgs; [
    nodejs_18
    nodePackages.npm
  ];

  shellHook = ''
    export NODE_PATH=$PWD/node_modules
    export PATH=$PWD/node_modules/.bin:$PATH
    echo "Node.js development environment ready"
    echo "Run ./run-test-nix.sh to test the photo gallery website"
  '';
} 