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
