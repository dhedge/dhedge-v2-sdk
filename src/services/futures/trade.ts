import { ethers } from "../..";
import { FUTURES_TRACKING, PRICE_IMPACT_DELTA } from "./constants";
import { iSynthetixFuturesMarket } from "./market";

export function getFuturesChangePositionTxData(
  amount: ethers.BigNumber | string,
  version: 1 | 2
): string {
  const args = [amount, ethers.utils.formatBytes32String(FUTURES_TRACKING)];
  if (version === 2) args.splice(1, 0, PRICE_IMPACT_DELTA);
  return iSynthetixFuturesMarket(version).encodeFunctionData(
    "modifyPositionWithTracking",
    args
  );
}

export function getFuturesClosePositionTxData(version: 1 | 2): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const args: any[] = [ethers.utils.formatBytes32String(FUTURES_TRACKING)];
  if (version === 2) args.unshift(PRICE_IMPACT_DELTA);
  return iSynthetixFuturesMarket(version).encodeFunctionData(
    "closePositionWithTracking",
    args
  );
}
