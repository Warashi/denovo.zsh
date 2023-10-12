import { existsSync, is, path, toml, xdg } from "./deps.ts";
import type { PredicateType } from "./deps.ts";

export const DENOVO_DENO_SOCK = Deno.env.get("DENOVO_DENO_SOCK");
export const DENOVO_DENO_JSON_SOCK = Deno.env.get("DENOVO_DENO_JSON_SOCK");
export const DENOVO_ZSH_SOCK = Deno.env.get("DENOVO_ZSH_SOCK");
export const DENOVO_APP_NAME = Deno.env.get("DENOVO_APP_NAME") ?? "denovo";
export type Config = PredicateType<typeof isConfig>;

const isConfig = is.ObjectOf({
  plugins: is.OptionalOf(is.Record),
});

const configFile = xdg.configDirs().map((name) =>
  path.join(name, DENOVO_APP_NAME, "config.toml")
).find((configPath) => existsSync(configPath));

function loadConfig(): Config {
  if (configFile == null) {
    return {};
  }
  const file = Deno.readTextFileSync(configFile);
  const config = toml.parse(file);
  if (isConfig(config)) {
    return config;
  }
  return {};
}

const config = loadConfig();
export function getConfig(name: string): unknown {
  return config?.plugins?.[name];
}
