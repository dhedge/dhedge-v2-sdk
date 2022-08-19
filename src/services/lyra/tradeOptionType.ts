export function getLyraTradeOptionType(
  isCall: boolean,
  isLong: boolean
): number {
  if (isCall) {
    return isLong ? 0 : 3;
  } else {
    return isLong ? 1 : 4;
  }
}
