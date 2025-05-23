/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { ApiError, ethers } from "../..";
import { networkChainIdMap } from "../../config";
import { Pool } from "../../entities";
import ActionMiscV3Abi from "../../abi/pendle/ActionMiscV3.json";

const pendleBaseUrl = "https://api-v2.pendle.finance/core/v1";

export async function getPendleSwapTxData(
  pool: Pool,
  tokenIn: string,
  tokenOut: string,
  amountIn: ethers.BigNumber | string,
  slippage: number
): Promise<string> {
  const expiredMarket = await checkExitPostExpPT(pool, tokenIn, tokenOut);
  if (expiredMarket) {
    return getExitExpPTTxData(pool, tokenOut, amountIn, expiredMarket);
  }
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

const checkExitPostExpPT = async (
  pool: Pool,
  tokenIn: string,
  tokenOut: string
): Promise<string | null> => {
  const networkId = networkChainIdMap[pool.network];
  let inactiveMarketResult;
  try {
    inactiveMarketResult = await axios.get(
      `${pendleBaseUrl}/${networkId}/markets/inactive`
    );
  } catch (e) {
    console.error("Error in Pendle API request:", e);
    throw new ApiError("Pendle api request failed");
  }
  const allInactiveMarkets = inactiveMarketResult.data.markets;
  const markets = [tokenIn, tokenOut].map(token =>
    allInactiveMarkets.find(
      (market: any) => market.pt === `${networkId}-${token.toLocaleLowerCase()}`
    )
  );
  if (markets[0]) {
    checkUnderlying(markets[0], tokenOut, networkId);
    return markets[0].address;
  } else if (markets[1]) {
    throw new Error("Can not trade to expired PT asset");
  } else {
    return null;
  }
};

const getExitExpPTTxData = (
  pool: Pool,
  tokenOut: string,
  amountIn: ethers.BigNumber | string,
  market: string
) => {
  const actionMiscV3 = new ethers.utils.Interface(ActionMiscV3Abi);
  const txData = actionMiscV3.encodeFunctionData("exitPostExpToToken", [
    pool.address, // receiver
    market, // market
    amountIn.toString(), // netPtIn
    0, // netLpIn
    [
      tokenOut,
      0, // minTokenOut
      tokenOut, // tokenRedeemSy,
      ethers.constants.AddressZero, //pendleSwap;
      // swapData
      [
        0, // swapType
        ethers.constants.AddressZero, // extRouter
        ethers.constants.HashZero, // extCalldata
        false // needScale
      ]
    ]
  ]);
  return txData;
};
