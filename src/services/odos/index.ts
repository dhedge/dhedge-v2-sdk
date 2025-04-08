/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { ApiError, ethers } from "../..";
import { networkChainIdMap } from "../../config";
import { Pool } from "../../entities";

const odosBaseUrl = "https://api.odos.xyz/sor";

export async function getOdosSwapTxData(
  pool: Pool,
  assetFrom: string,
  assetTo: string,
  amountIn: ethers.BigNumber | string,
  slippage: number
): Promise<string> {
  const quoteParams = {
    chainId: networkChainIdMap[pool.network],
    inputTokens: [
      {
        tokenAddress: assetFrom,
        amount: amountIn.toString()
      }
    ],
    outputTokens: [
      {
        tokenAddress: assetTo,
        proportion: 1
      }
    ],
    slippageLimitPercent: slippage,
    userAddr: pool.address
  };
  try {
    const quoteResult = await axios.post(
      `${odosBaseUrl}/quote/v2`,
      quoteParams
    );

    const assembleParams = {
      pathId: quoteResult.data.pathId,
      userAddr: pool.address
    };

    const assembleResult = await axios.post(
      `${odosBaseUrl}/assemble`,
      assembleParams
    );
    return assembleResult.data.transaction.data;
  } catch (e) {
    console.error("Error in Odos API request:", e);
    throw new ApiError("Swap api request of Odos failed");
  }
}
