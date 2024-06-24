/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { ApiError, ethers } from "../..";
import { networkChainIdMap } from "../../config";
import { Pool } from "../../entities";

const oneInchBaseUrl = "https://api.1inch.dev/swap/v6.0/";

export async function getOneInchSwapTxData(
  pool: Pool,
  assetFrom: string,
  assetTo: string,
  amountIn: ethers.BigNumber | string,
  slippage: number
): Promise<string> {
  if (!process.env.ONEINCH_API_KEY)
    throw new Error("ONEINCH_API_KEY not configured in .env file");

  const chainId = networkChainIdMap[pool.network];
  const apiUrl = `${oneInchBaseUrl}${chainId}/swap`;
  const params = {
    src: assetFrom,
    dst: assetTo,
    amount: amountIn.toString(),
    from: pool.address,
    origin: pool.signer.address,
    slippage: slippage,
    disableEstimate: true,
    usePermit2: false
  };
  try {
    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${process.env.ONEINCH_API_KEY}`
      },
      params
    });
    return response.data.tx.data;
  } catch (e) {
    throw new ApiError("Swap api request of 1inch failed");
  }
}
