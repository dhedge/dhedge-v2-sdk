export function getLyraTradeOptionType(
  isCall: boolean,
  isLong: boolean,
  isCoveredCall: boolean
): number {
  if (isCall) {
    return isLong ? 0 : isCoveredCall ? 2 : 3;
  } else {
    return isLong ? 1 : 4;
  }
}

export function isCall(optionType: number): boolean {
  return [0, 2, 3].includes(optionType);
}

export function isLong(optionType: number): boolean {
  return optionType === 0 || optionType === 1;
}
