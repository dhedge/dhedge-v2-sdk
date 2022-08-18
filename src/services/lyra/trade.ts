/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { BigNumber, ethers } from "ethers";
import { Pool } from "../..";
import { LyraOptionMarket, LyraOptionType, LyraTradeType } from "../../types";
import { getStrike } from "./markets";
import IOptionMarketWrapper from "../../abi/IOptionMarketWrapper.json";
import { lyraOptionMarkets } from "../../config";
import { getLyraCallPutType, getLyraTradeOptionType } from "./tradeOptionType";
import { getOptionPositions } from "./positions";

export async function getLyraOptionTxData(
  pool: Pool,
  market: LyraOptionMarket,
  optionType: LyraOptionType,
  expiry: number,
  strike: number,
  tradeType: LyraTradeType,
  optionAmount: BigNumber | string,
  amountIn: BigNumber | string,
  assetIn: string,
  slippage = 0.5
): Promise<any> {
  const optionStrike = await getStrike(pool.network, market, expiry, strike);
  const strikeId = optionStrike.id;
  const lyraOptionType = getLyraTradeOptionType(optionType, tradeType);

  const positions = await getOptionPositions(pool, market);
  const existingPosition = positions.filter(
    e =>
      e.strikeId.toNumber() === strikeId &&
      getLyraCallPutType(optionType).includes(e.optionType) &&
      e.state === 1
  );
  const positionId =
    existingPosition.length > 0 ? existingPosition[0].positionId : 0;

  let txFunction = "openPosition";
  if (existingPosition.length > 0) {
    if (
      //sell long positions
      (tradeType === "sell" &&
        [0, 1].includes(existingPosition[0].optionType)) ||
      //cover short positions
      (tradeType === "buy" && [3, 4].includes(existingPosition[0].optionType))
    ) {
      txFunction = "forceClosePosition";
    }
  }

  //TODO Calculate min cost and max cost with slippage
  console.log("slippage", slippage);
  //Maybe TODO Check if we can derive the amountIn from the assetIn and option amount

  const iOptionMarketWrapper = new ethers.utils.Interface(
    IOptionMarketWrapper.abi
  );
  const tradeTx = iOptionMarketWrapper.encodeFunctionData(txFunction, [
    [
      lyraOptionMarkets[pool.network]![market],
      strikeId, // strike Id
      positionId, // position Id
      1, // iteration
      0, // set collateral to
      0, // current collateral
      lyraOptionType, // optionType
      optionAmount, // amount
      0, // min cost
      ethers.constants.MaxUint256, // max cost
      amountIn, // input amount
      assetIn // input asset
    ]
  ]);
  return tradeTx;
}
