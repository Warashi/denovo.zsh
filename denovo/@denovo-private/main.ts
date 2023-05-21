import { start } from "./listen.ts";
import { printf } from "./deps.ts";
import { existsSync } from "./deps.ts";
import { DENOVO_DENO_SOCK, DENOVO_ZSH_SOCK } from "./settings.ts";
import { evalZsh } from "./eval.ts";

const denoSocketPath = DENOVO_DENO_SOCK;
const zshSocketPath = DENOVO_ZSH_SOCK;

if (denoSocketPath == null) {
  printf("env:DENOVO_DENO_SOCK is empty\n");
  Deno.exit(1);
}

if (zshSocketPath == null) {
  printf("env:DENOVO_ZSH_SOCK is empty\n");
  Deno.exit(1);
}

function cancellable(): [Promise<void>, () => void] {
  let r: () => void = () => {};
  const p = new Promise<void>((resolve, _reject) => {
    r = resolve;
  });
  return [p, r];
}

const [p, cancel] = cancellable()

const signalHandler = () => {
  cancel()
  Deno.removeSync(denoSocketPath);
  Deno.exit();
};

Deno.addSignalListener("SIGINT", signalHandler);
Deno.addSignalListener("SIGTERM", signalHandler);
Deno.addSignalListener("SIGHUP", signalHandler);

if (existsSync(denoSocketPath)) {
  printf("env:DENOVO_DENO_SOCK is already exists: %s\n", denoSocketPath);
  Deno.exit();
}

start(zshSocketPath, denoSocketPath);
(await evalZsh("_denovo_discover")).pipeTo(Deno.stderr.writable);
await p;

