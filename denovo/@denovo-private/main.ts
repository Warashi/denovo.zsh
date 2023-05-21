import { listen } from "./listen.ts";
import { printf } from "./deps.ts";
import { existsSync } from "./deps.ts";
import { DENOVO_DENO_SOCK } from "./settings.ts";
import { evalZsh } from "./eval.ts";

const socketPath = DENOVO_DENO_SOCK;

if (socketPath == null) {
  printf("env:DENOVO_DENO_SOCK is empty\n");
  Deno.exit(1);
}

const signalHandler = () => {
  Deno.removeSync(socketPath);
  Deno.exit();
};

Deno.addSignalListener("SIGINT", signalHandler);
Deno.addSignalListener("SIGTERM", signalHandler);
Deno.addSignalListener("SIGHUP", signalHandler);

if (existsSync(socketPath)) {
  printf("env:DENOVO_DENO_SOCK is already exists: %s\n", socketPath);
  Deno.exit();
}

const listener = listen(socketPath);
(await evalZsh("_denovo_discover")).pipeTo(Deno.stderr.writable);
await listener;
