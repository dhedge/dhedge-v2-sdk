/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { BigNumber, ethers } from "ethers";
import { Pool } from "../..";
import { LyraOptionMarket, LyraOptionType, LyraTradeType } from "../../types";
import { getOptionStrike } from "./markets";
import IOptionMarketWrapper from "../../abi/IOptionMarketWrapper.json";
import { lyraOptionMarkets } from "../../config";
import { getLyraTradeOptionType } from "./tradeOptionType";

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
  const optionStrike = await getOptionStrike(
    market,
    strike,
    expiry,
    pool.network,
    pool.signer
  );

  //TODO Check for existing position and add to or close position
  //TODO Calculate min cost and max cost with slippage
  console.log("slippage", slippage);
  //TODO Check if we can derive the amountIn from the assetIn and option amount

  const iOptionMarketWrapper = new ethers.utils.Interface(
    IOptionMarketWrapper.abi
  );
  const tradeTx = iOptionMarketWrapper.encodeFunctionData("openPosition", [
    [
      lyraOptionMarkets[pool.network]![market],
      optionStrike[0], // strike Id
      0, // position Id
      1, // iteration
      0, // set collateral to
      0, // current collateral
      getLyraTradeOptionType(optionType, tradeType), // optionType
      optionAmount, // amount
      0, // min cost
      ethers.constants.MaxUint256, // max cost
      amountIn, // input amount
      assetIn // input asset
    ]
  ]);
  return tradeTx;
}
