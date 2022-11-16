import { BigNumber } from "ethers";
import { ethers, Pool } from "../..";
import ISynthetixFuturesMarket from "../../abi/ISynthetixFuturesMarket.json";

export function getFuturesChangeMarginTxData(
  amount: ethers.BigNumber | string
): string {
  const iSynthetixFuturesMarket = new ethers.utils.Interface(
    ISynthetixFuturesMarket.abi
  );
  return iSynthetixFuturesMarket.encodeFunctionData("transferMargin", [amount]);
}

export async function getSynthetixFuturesMargin(
  pool: Pool,
  market: string
): Promise<BigNumber> {
  const iFuturesMarket = new ethers.Contract(
    market,
    ISynthetixFuturesMarket.abi,
    pool.signer
  );
  return (await iFuturesMarket.accessibleMargin(pool.address)).marginAccessible;
}
