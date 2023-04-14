import { Pool, ethers } from "../..";
import { FUTURES_TRACKING } from "./constants";
import ISynthetixFuturesMarketV2 from "../../abi/ISynthetixFuturesMarketV2.json";

export async function getFuturesChangePositionTxData(
  amount: ethers.BigNumber | string,
  market: string,
  pool: Pool
): Promise<string> {
  const futuresMarket = new ethers.Contract(
    market,
    ISynthetixFuturesMarketV2.abi,
    pool.signer
  );
  const fillPrice = await futuresMarket.fillPrice(amount);
  const adjustmentFactor = ethers.BigNumber.from(amount).lt(0) ? 995 : 1005;

  return new ethers.utils.Interface(
    ISynthetixFuturesMarketV2.abi
  ).encodeFunctionData("submitOffchainDelayedOrderWithTracking", [
    amount,
    fillPrice.price.mul(adjustmentFactor).div(1000),
    ethers.utils.formatBytes32String(FUTURES_TRACKING)
  ]);
}
