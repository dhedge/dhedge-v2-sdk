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
  //Allows for +-0.5% price movements on the desired fill price
  const adjustmentFactor = ethers.BigNumber.from(amount).lt(0) ? 995 : 1005;
  const desiredFillPrice = fillPrice.price.mul(adjustmentFactor).div(1000);
  return new ethers.utils.Interface(
    ISynthetixFuturesMarketV2.abi
  ).encodeFunctionData("submitOffchainDelayedOrderWithTracking", [
    amount,
    desiredFillPrice,
    ethers.utils.formatBytes32String(FUTURES_TRACKING)
  ]);
}

export async function getFuturesCancelOrderTxData(pool: Pool): Promise<string> {
  return new ethers.utils.Interface(
    ISynthetixFuturesMarketV2.abi
  ).encodeFunctionData("cancelOffchainDelayedOrder", [pool.address]);
}

export async function getDelayedOrders(
  market: string,
  pool: Pool
): Promise<void> {
  const futuresMarket = new ethers.Contract(
    market,
    ISynthetixFuturesMarketV2.abi,
    pool.signer
  );
  const orders = await futuresMarket.delayedOrders(pool.address);
  console.log(orders);
}
