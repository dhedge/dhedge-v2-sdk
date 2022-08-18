export function getLyraTradeOptionType(
  isCall: boolean,
  isLong: boolean
): number {
  if (isCall) {
    return isLong ? 0 : 1;
  } else {
    return isLong ? 3 : 4;
  }
}
