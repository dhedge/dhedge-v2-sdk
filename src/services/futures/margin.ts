import { BigNumber } from "ethers";
import { ethers, Pool } from "../..";
import { iSynthetixFuturesMarket } from "./market";

export function getFuturesChangeMarginTxData(
  amount: ethers.BigNumber | string,
  version: 1 | 2
): string {
  return iSynthetixFuturesMarket(version).encodeFunctionData("transferMargin", [
    amount
  ]);
}

export async function getSynthetixFuturesMargin(
  pool: Pool,
  market: string
): Promise<BigNumber> {
  const iFuturesMarket = new ethers.Contract(
    market,
    iSynthetixFuturesMarket(1),
    pool.signer
  );
  return (await iFuturesMarket.accessibleMargin(pool.address)).marginAccessible;
}
