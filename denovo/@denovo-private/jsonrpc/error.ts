import { Error } from "./types.ts";

export const ErrorInvalidRequest: Error = {
  jsonrpc: "2.0",
  error: {
    code: -32600,
    message: "Invalid Request",
  },
};
