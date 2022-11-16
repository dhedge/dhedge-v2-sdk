import { ethers } from "../..";
import ISynthetixFuturesMarket from "../../abi/ISynthetixFuturesMarket.json";


export function getFuturesChangePositionTxData(
  amount: ethers.BigNumber | string
): string {
  const iSynthetixFuturesMarket = new ethers.utils.Interface(
    ISynthetixFuturesMarket.abi
  );
  return iSynthetixFuturesMarket.encodeFunctionData(
    "modifyPositionWithTracking",
    [amount, ethers.utils.formatBytes32String("tracking")]
  );
}

export function getFuturesClosePositionTxData(): string {
  const iSynthetixFuturesMarket = new ethers.utils.Interface(
    ISynthetixFuturesMarket.abi
  );
  return iSynthetixFuturesMarket.encodeFunctionData(
    "closePositionWithTracking",
    [ethers.utils.formatBytes32String("tracking")]
  );
}
