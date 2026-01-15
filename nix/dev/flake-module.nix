{ inputs, ... }:
{
  imports = [
    # keep-sorted start
    inputs.devshell.flakeModule
    inputs.git-hooks.flakeModule
    inputs.treefmt-nix.flakeModule
    # keep-sorted end
  ];
  perSystem =
    {
      config,
      pkgs,
      system,
      ...
    }:
    {
      pre-commit = {
        check.enable = true;
        settings = {
          src = ../../.;
          hooks = {
            actionlint.enable = false;
            treefmt.enable = true;
          };
        };
      };

      treefmt = {
        projectRootFile = "flake.nix";
        programs = {
          deno.enable = true;
          nixfmt.enable = true;
          shfmt = {
            enable = true;
            indent_size = 0;
          };
        };
        settings.formatter = {
          altshfmt =
            let
              altshfmt = pkgs.callPackage ../altshfmt { };
            in
            {
              command = "sh";
              options = [
                "-c"
                ''${altshfmt}/bin/altshfmt -l "$@" | xargs ${altshfmt}/bin/altshfmt -w''
              ];
              includes = [ "*.sh" ];
            };
          shfmt = {
            includes = [ "*.zsh" ];
            excludes = [ "*.sh" ];
          };
        };
      };

      devshells.default = {
        devshell = {
          packages =
            with pkgs;
            let
              tree-sitter' = tree-sitter.overrideAttrs (
                finalAttrs: previousAttrs: rec {
                  version = "0.26.3";
                  src = fetchFromGitHub {
                    owner = "tree-sitter";
                    repo = "tree-sitter";
                    rev = "v${version}";
                    hash = "sha256-G1C5IhRIVcWUwEI45ELxCKfbZnsJoqan7foSzPP3mMg=";
                  };
                  cargoDeps = rustPlatform.fetchCargoVendor {
                    inherit (finalAttrs) pname src version;
                    hash = "sha256-kHYLaiCHyKG+DL+T2s8yumNHFfndrB5aWs7ept0X4CM=";
                  };
                  nativeBuildInputs = previousAttrs.nativeBuildInputs ++ [
                    rustPlatform.bindgenHook
                    pkg-config
                  ];
                  buildInputs = previousAttrs.buildInputs ++ [
                    openssl
                  ];
                  patches = [ ];
                }
              );
            in
            [
              tree-sitter'
              shellspec
              zsh
            ]
            ++ lib.optional stdenv.isLinux kcov;
          startup = {
            pre-commit = {
              text = config.pre-commit.installationScript;
            };
          };
        };
      };
    };
}
