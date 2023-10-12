import { is } from "../deps.ts";
import type { PredicateType } from "../deps.ts";

export type ResponseWithId = Response & { id: number };
export type Request = PredicateType<typeof isRequest>;
export type Response = PredicateType<typeof isResponse>;
export type Success = PredicateType<typeof isSuccess>;
export type Error = PredicateType<typeof isError>;

export const isRequest = is.ObjectOf({
  jsonrpc: is.LiteralOf("2.0"),
  id: is.OptionalOf(is.Number),
  method: is.String,
  params: is.Array,
});

export const isSuccess = is.ObjectOf({
  jsonrpc: is.LiteralOf("2.0"),
  result: is.OptionalOf(is.Any),
});

export const isError = is.ObjectOf({
  jsonrpc: is.LiteralOf("2.0"),
  error: is.ObjectOf({
    code: is.Number,
    message: is.String,
    data: is.OptionalOf(is.Any),
  }),
});

export const isResponse = is.OneOf([isSuccess, isError]);

export function NewRequest(args: {
  id?: number;
  method: string;
  params: unknown[];
}): Request {
  return { jsonrpc: "2.0", ...args };
}

export function NewSuccess(args: {
  result?: unknown;
}): Success {
  return { jsonrpc: "2.0", ...args };
}

export function NewError(args: {
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}): Error {
  return { jsonrpc: "2.0", ...args };
}
