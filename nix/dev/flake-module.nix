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
            actionlint.enable = true;
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
                ''
                  ${altshfmt}/bin/altshfmt -l "$@" | xargs --no-run-if-empty ${altshfmt}/bin/altshfmt -w
                ''
                "--"
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
              altshfmt = pkgs.callPackage ../altshfmt { };
            in
            [
              altshfmt
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
