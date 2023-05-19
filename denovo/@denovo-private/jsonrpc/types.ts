import { z } from "https://deno.land/x/zod@v3.21.4/mod.ts";

export type Request = z.infer<typeof Request>;
export type Response = Success | Error;
export type Success = z.infer<typeof Success>;
export type Error = z.infer<typeof Error>;

const Request = z.object({
  jsonrpc: z.enum(["2.0"]),
  id: z.number().optional(),
  method: z.string(),
  params: z.array(z.unknown()),
});

const Success = z.object({
  jsonrpc: z.enum(["2.0"]),
  id: z.number().optional(),
  result: z.unknown().optional(),
});

const Error = z.object({
  jsonrpc: z.enum(["2.0"]),
  id: z.number().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.unknown().optional(),
  }),
});

export function isRequest(x: unknown): x is Request {
  return Request.safeParse(x).success;
}

export function isSuccess(x: unknown): x is Success {
  return Success.safeParse(x).success;
}

export function isError(x: unknown): x is Error {
  return Error.safeParse(x).success;
}

export function NewRequest(args: {
  id?: number;
  method: string;
  params: unknown[];
}): Request {
  return { jsonrpc: "2.0", ...args };
}

export function NewSuccess(args: {
  id?: number;
  result?: unknown;
}): Success {
  return { jsonrpc: "2.0", ...args };
}

export function NewError(args: {
  id?: number;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}): Error {
  return { jsonrpc: "2.0", ...args };
}
