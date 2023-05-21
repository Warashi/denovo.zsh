import { assertString } from "https://deno.land/x/unknownutil@v2.1.1/mod.ts";
import { Denovo } from "../@denovo/mod.ts";

export async function main(denovo: Denovo): Promise<void> {
  const result = await denovo.eval("echo hello world");
  console.log(result.trim());
  denovo.dispatcher = {
    async echo(...args: unknown[]): Promise<unknown[]> {
      return args;
    },
  };
}
