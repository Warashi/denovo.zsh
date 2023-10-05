import { start, startJsonServer } from "./listen.ts";
import { printf } from "./deps.ts";
import { existsSync } from "./deps.ts";
import {
  DENOVO_DENO_JSON_SOCK,
  DENOVO_DENO_SOCK,
  DENOVO_ZSH_SOCK,
} from "./settings.ts";
import { evalZsh } from "./eval.ts";

const denoSocketPath = DENOVO_DENO_SOCK;
const denoJsonSocketPath = DENOVO_DENO_JSON_SOCK;
const zshSocketPath = DENOVO_ZSH_SOCK;

if (denoSocketPath == null) {
  printf("env:DENOVO_DENO_SOCK is empty\n");
  Deno.exit(1);
}

if (denoJsonSocketPath == null) {
  printf("env:DENOVO_DENO_JSON_SOCK is empty\n");
  Deno.exit(1);
}

if (zshSocketPath == null) {
  printf("env:DENOVO_ZSH_SOCK is empty\n");
  Deno.exit(1);
}

if (existsSync(denoSocketPath)) {
  printf("env:DENOVO_DENO_SOCK is already exists: %s\n", denoSocketPath);
  Deno.exit(1);
}

if (existsSync(denoJsonSocketPath)) {
  printf(
    "env:DENOVO_DENO_JSON_SOCK is already exists: %s\n",
    denoJsonSocketPath,
  );
  Deno.exit(1);
}

const signalHandler = () => {
  Deno.removeSync(denoSocketPath);
  Deno.removeSync(denoJsonSocketPath);
  Deno.exit();
};

Deno.addSignalListener("SIGINT", signalHandler);
Deno.addSignalListener("SIGTERM", signalHandler);
Deno.addSignalListener("SIGHUP", signalHandler);

const p = Promise.all([
  start(zshSocketPath, denoSocketPath),
  startJsonServer(denoJsonSocketPath),
]);

await evalZsh(
  `typeset -g _DENOVO_DENO_PID="${Deno.pid}"; _denovo_discover`,
  { transport: "unix", path: zshSocketPath },
);

await p;
