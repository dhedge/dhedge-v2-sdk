import BigNumber from "bignumber.js";
import { Pool } from "../..";
import { getKyberSwapTxData } from "../kyberSwap";
import { getOneInchSwapTxData } from "../oneInch";

export const SWAPPER_ADDRESS = "0x4F754e0F0924afD74980886b0B479Fa1D7C58D0D";

// Order matters: routers are tried in sequence by init/completeWithdrawal.
// KyberSwap is the primary route; 1inch is the fallback.
export const ROUTER_KEYS = ["KYBER_SWAP_V2", "ONE_INCH"] as const;

export type RouterKey = typeof ROUTER_KEYS[number];

export interface SwapParams {
  srcAsset: string;
  srcAmount: string;
  dstAsset: string;
  slippage: number; // in basis points (100 = 1%)
}

export const getSwapData = async (
  pool: Pool,
  params: SwapParams,
  routerKeyString: RouterKey
): Promise<string> => {
  const { srcAsset, srcAmount, dstAsset, slippage } = params;
  // Convert basis points to percentage for aggregator APIs
  const slippagePercent = new BigNumber(slippage).div(100).toNumber();

  if (routerKeyString === "KYBER_SWAP_V2") {
    const { swapTxData } = await getKyberSwapTxData(
      pool,
      srcAsset,
      dstAsset,
      srcAmount,
      slippagePercent,
      SWAPPER_ADDRESS,
      SWAPPER_ADDRESS
    );
    return swapTxData;
  } else if (routerKeyString === "ONE_INCH") {
    const { swapTxData } = await getOneInchSwapTxData(
      pool,
      srcAsset,
      dstAsset,
      srcAmount,
      slippagePercent,
      SWAPPER_ADDRESS,
      SWAPPER_ADDRESS
    );
    return swapTxData;
  } else {
    throw new Error(`Unsupported router: ${routerKeyString}`);
  }
};
