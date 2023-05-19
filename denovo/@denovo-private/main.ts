import { listen } from "./listen.ts";
import { printf } from "https://deno.land/std@0.176.0/fmt/printf.ts";
import { existsSync } from "https://deno.land/std@0.187.0/fs/exists.ts";
import { DENOVO_DENO_SOCK } from "./settings.ts";

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

await listen(socketPath);
