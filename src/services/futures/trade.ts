import { ethers } from "../..";
import { FUTURES_TRACKING, PRICE_IMPACT_DELTA } from "./constants";
import ISynthetixFuturesMarketV2 from "../../abi/ISynthetixFuturesMarketV2.json";

export function getFuturesChangePositionTxData(
  amount: ethers.BigNumber | string
): string {
  return new ethers.utils.Interface(
    ISynthetixFuturesMarketV2.abi
  ).encodeFunctionData("submitOffchainDelayedOrderWithTracking", [
    amount,
    PRICE_IMPACT_DELTA,
    ethers.utils.formatBytes32String(FUTURES_TRACKING)
  ]);
}
