import type { Meta } from "@warashi/denovo-core";

const CONSOLE_PATCH_METHODS = [
  "log",
  "info",
  "debug",
  "warn",
  "error",
] as const satisfies (keyof typeof console)[];

const PRIORITIES = {
  log: "notice",
  info: "info",
  debug: "debug",
  warn: "warning",
  error: "error",
} as const satisfies Record<typeof CONSOLE_PATCH_METHODS[number], string>;

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

export function patchConsole(meta: Meta): void {
  for (const name of CONSOLE_PATCH_METHODS) {
    if (name === "debug" && meta.mode !== "debug") {
      console[name] = () => {};
      continue;
    }
    console[name] = (...args: unknown[]): void => {
      const message = formatArgs(args).join(" ");
      new Deno.Command("logger", {
        args: [
          "-t",
          "denovo",
          "-p",
          `user.${PRIORITIES[name]}`,
          message,
        ],
      }).outputSync();
    };
  }
}
