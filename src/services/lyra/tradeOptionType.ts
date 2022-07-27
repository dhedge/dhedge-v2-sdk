import { LyraOptionType, LyraTradeType } from "../../types";

export function getLyraTradeOptionType(
  optionType: LyraOptionType,
  tradeType: LyraTradeType
): number {
  if (tradeType === "buy") {
    return optionType === "call" ? 0 : 1;
  } else {
    return optionType === "call" ? 3 : 4;
  }
}

export function getLyraCallPutType(optionType: LyraOptionType): number[] {
  if (optionType === "call") {
    return [0, 3];
  } else {
    return [1, 4];
  }
}
