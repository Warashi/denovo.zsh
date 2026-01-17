{
  inputs = {
    # keep-sorted start block=yes
    flake-parts = {
      url = "github:hercules-ci/flake-parts";
    };
    nixpkgs = {
      url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    };
    # keep-sorted end
  };

  outputs =
    inputs@{ flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [
        inputs.flake-parts.flakeModules.partitions
      ];

      partitionedAttrs = {
        # keep-sorted start
        checks = "dev";
        devShells = "dev";
        formatter = "dev";
        # keep-sorted end
      };
      partitions.dev = {
        extraInputsFlake = ./nix/dev;
        module = ./nix/dev/flake-module.nix;
      };

      perSystem =
        {
          inputs',
          system,
          pkgs,
          ...
        }:
        {
        };

      systems = [
        "aarch64-linux"
        "x86_64-linux"
        "aarch64-darwin"
        "x86_64-darwin"
      ];
    };
}
