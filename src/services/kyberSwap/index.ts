import axios from "axios";
import { ApiError, ethers } from "../..";
import { Pool } from "../../entities";

export const kyberBaseUrl = "https://aggregator-api.kyberswap.com";

export async function getKyberSwapTxData(
  pool: Pool,
  tokenIn: string,
  tokenOut: string,
  amountIn: ethers.BigNumber | string,
  slippage: number
): Promise<{ swapTxData: string; minAmountOut: string }> {
  const params = {
    tokenIn,
    tokenOut,
    amountIn: amountIn.toString()
  };
  try {
    const quoteResult = await axios.get(
      `${kyberBaseUrl}/${pool.network}/api/v1/routes`,
      {
        params,
        headers: {
          "x-client-id": "dHEDGE"
        }
      }
    );

    const buildParams = {
      routeSummary: quoteResult.data.data.routeSummary,
      sender: pool.address,
      recipient: pool.address,
      slippageTolerance: slippage * 100 // in basis points
    };

    const buildResult = await axios.post(
      `${kyberBaseUrl}/${pool.network}/api/v1/route/build`,
      buildParams,
      {
        headers: {
          "x-client-id": "dHEDGE"
        }
      }
    );

    return {
      swapTxData: buildResult.data.data.data,
      minAmountOut: buildResult.data.data.amountOut
    };
  } catch (e) {
    console.error("Error in KyberSwap API request:", e);
    throw new ApiError("Swap api request of KyberSwap failed");
  }
}
