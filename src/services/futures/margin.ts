import { ethers } from "../..";
import ISynthetixFuturesMarketV2 from "../../abi/ISynthetixFuturesMarketV2.json";

export function getFuturesChangeMarginTxData(
  amount: ethers.BigNumber | string
): string {
  return new ethers.utils.Interface(
    ISynthetixFuturesMarketV2.abi
  ).encodeFunctionData("transferMargin", [amount]);
}
