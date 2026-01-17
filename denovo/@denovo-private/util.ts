import type { CallResult, Meta } from "@warashi/denovo-core";
import type { Predicate } from "@core/unknownutil/type";
import { isLiteralOneOf } from "@core/unknownutil/is/literal-one-of";
import { isObjectOf } from "@core/unknownutil/is/object-of";
import { isString } from "@core/unknownutil/is/string";
import { isNumber } from "@core/unknownutil/is/number";
import { isUnknown } from "@core/unknownutil/is/unknown";

export const isMeta: Predicate<Meta> = isObjectOf({
  mode: isLiteralOneOf(["release", "debug", "test"] as const),
  host: isLiteralOneOf(["zsh"] as const),
  version: isString,
  platform: isLiteralOneOf(["windows", "mac", "linux"] as const),
});

export const isCallResult: Predicate<CallResult> = isObjectOf({
  exit_code: isNumber,
  output: isUnknown,
});
