/* eslint-disable @typescript-eslint/no-explicit-any */
import { Pool, ethers } from "../..";
import ISynthetixFuturesMarketV2 from "../../abi/ISynthetixFuturesMarketV2.json";
export async function getDelayedOrders(
  market: string,
  pool: Pool
): Promise<any> {
  const futuresMarket = new ethers.Contract(
    market,
    ISynthetixFuturesMarketV2.abi,
    pool.signer
  );
  return await futuresMarket.delayedOrders(pool.address);
}
