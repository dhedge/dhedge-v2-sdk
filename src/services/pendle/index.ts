/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { ApiError, ethers } from "../..";
import { networkChainIdMap } from "../../config";
import { Pool } from "../../entities";
import ActionMiscV3Abi from "../../abi/pendle/ActionMiscV3.json";
import PTAbi from "../../abi/pendle/PT.json";
import SYAbi from "../../abi/pendle/SY.json";
import BigNumber from "bignumber.js";

const pendleBaseUrl = "https://api-v2.pendle.finance/core/v1";

export async function getPendleSwapTxData(
  pool: Pool,
  tokenIn: string,
  tokenOut: string,
  amountIn: ethers.BigNumber | string,
  slippage: number
): Promise<{ swapTxData: string; minAmountOut: string | null }> {
  const expiredMarket = await checkExitPostExpPT(pool, tokenIn, tokenOut);
  if (expiredMarket) {
    const result = await getExitExpPTTxData(
      pool,
      tokenIn,
      tokenOut,
      amountIn,
      expiredMarket
    );
    return {
      swapTxData: result.txData,
      minAmountOut: result.minAmountOut
    };
  }
  const params = {
    receiver: pool.address,
    tokenIn,
    tokenOut,
    amountIn: amountIn.toString(),
    slippage: slippage / 100
  };
  const market = await getMarket(pool, tokenIn, tokenOut);
  try {
    const swapResult = await axios.get(
      `${pendleBaseUrl}/sdk/${
        networkChainIdMap[pool.network]
      }/markets/${market}/swap`,
      { params }
    );
    return {
      swapTxData: swapResult.data.tx.data,
      minAmountOut: swapResult.data.data.amountOut
    };
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

const getExitExpPTTxData = async (
  pool: Pool,
  tokenIn: string,
  tokenOut: string,
  amountIn: ethers.BigNumber | string,
  market: string
): Promise<{ txData: string; minAmountOut: string | null }> => {
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

  // Get the PT contract instance
  const PTcontract = new ethers.Contract(tokenIn, PTAbi, pool.signer);
  // Get the SY contract instance
  const SYcontract = new ethers.Contract(
    await PTcontract.SY(),
    SYAbi,
    pool.signer
  );

  const exchangeRate = await SYcontract.exchangeRate();
  const minAmountOut = new BigNumber(amountIn.toString())
    .times(1e18)
    .div(exchangeRate.toString())
    .decimalPlaces(0, BigNumber.ROUND_DOWN)
    .toFixed(0);
  return {
    txData,
    minAmountOut
  };
};
