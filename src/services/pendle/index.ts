/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { ApiError, ethers } from "../..";
import { networkChainIdMap } from "../../config";
import { Pool } from "../../entities";

const pendleBaseUrl = "https://api-v2.pendle.finance/core/v1";

export async function getPendleSwapTxData(
  pool: Pool,
  tokenIn: string,
  tokenOut: string,
  amountIn: ethers.BigNumber | string,
  slippage: number
): Promise<string> {
  const params = {
    receiver: pool.address,
    tokenIn,
    tokenOut,
    amountIn: amountIn.toString(),
    slippage
  };
  const market = await getMarket(pool, tokenIn, tokenOut);
  try {
    const swapResult = await axios.get(
      `${pendleBaseUrl}/sdk/${
        networkChainIdMap[pool.network]
      }/markets/${market}/swap`,
      { params }
    );

    console.log("swapResult", swapResult.data);

    return swapResult.data.tx.data;
  } catch (e) {
    console.error("Error in Pendle API request:", e);
    throw new ApiError("Pendle api request failed");
  }
}

const checkUnderlying = (market: any, token: string, networkId: number) => {
  if (market.underlyingAsset !== `${networkId}-${token.toLocaleLowerCase()}`) {
    throw new Error("Can only trade in or out of the underlying asset");
  }
};

export async function getMarket(
  pool: Pool,
  tokenIn: string,
  tokenOut: string
): Promise<string> {
  const networkId = networkChainIdMap[pool.network];
  let marketResult;
  try {
    marketResult = await axios.get(
      `${pendleBaseUrl}/${networkId}/markets/active`
    );
  } catch (e) {
    console.error("Error in Pendle API request:", e);
    throw new ApiError("Pendle api request failed");
  }

  const allMarkets = marketResult.data.markets;
  const markets = [tokenIn, tokenOut].map(token =>
    allMarkets.find(
      (market: any) => market.pt === `${networkId}-${token.toLocaleLowerCase()}`
    )
  );
  if (markets[0]) {
    checkUnderlying(markets[0], tokenOut, networkId);
    return markets[0].address;
  } else if (markets[1]) {
    checkUnderlying(markets[1], tokenIn, networkId);
    return markets[1].address;
  } else {
    throw new Error("Can only trade PT assets");
  }
}
