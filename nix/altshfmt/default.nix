{
  lib,
  stdenv,
  fetchFromGitHub,
  shfmt,
  gawk,
  makeWrapper,
}:
stdenv.mkDerivation rec {
  pname = "altshfmt";
  version = "0.2.0";

  src = fetchFromGitHub {
    owner = "shellspec";
    repo = "altshfmt";
    rev = "v${version}";
    hash = "sha256-iBb5aqUa7LpR3cpIFUciW+HkTZvUPhw/R+4EcRFxQpo=";
  };

  buildInputs = [ shfmt ];
  nativeBuildInputs = [ makeWrapper ];
  installPhase = ''
    mkdir -p $out/bin
    cp $src/altshfmt $out/bin/
    wrapProgram $out/bin/altshfmt \
      --prefix PATH : ${
        lib.makeBinPath [
          gawk
          shfmt
        ]
      }
  '';
}
