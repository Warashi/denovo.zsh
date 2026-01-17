import type { Meta } from "@warashi/denovo-core";
import type { Host } from "./host.ts";

const CONSOLE_PATCH_METHODS = [
  "log",
  "info",
  "debug",
  "warn",
  "error",
] as const satisfies (keyof typeof console)[];

function replacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  } else if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  } else if (value instanceof Set) {
    return [...value.values()];
  }
  return value;
}

function formatArgs(args: unknown[]): string[] {
  return args.map((v) => {
    if (v instanceof Error) {
      return `${v.stack ?? v}`;
    } else if (typeof v === "string") {
      return v;
    }
    return JSON.stringify(v, replacer);
  });
}

export function patchConsole(host: Host, meta: Meta): void {
  for (const name of CONSOLE_PATCH_METHODS) {
    if (name === "debug" && meta.mode !== "debug") {
      console[name] = () => {};
      continue;
    }
    const orig = console[name].bind(console);
    const fn = `_denovo_logger_${name}`;
    console[name] = (...args: unknown[]): void => {
      host
        .notify(fn, ...formatArgs(args))
        .catch(() => orig(...args));
    };
  }
}
