/* eslint-disable @typescript-eslint/no-explicit-any */
import { BigNumber, ethers } from "ethers";
import { Pool } from "../..";
import { LyraOptionMarket, LyraOptionType, LyraTradeType } from "../../types";
import { getStrike } from "./markets";
import IOptionMarketWrapper from "../../abi/IOptionMarketWrapper.json";
import { getLyraTradeOptionType } from "./tradeOptionType";
import { getPositions } from "./positions";
import { getQuote } from "./quote";

export async function getLyraOptionTxData(
  pool: Pool,
  market: LyraOptionMarket,
  optionType: LyraOptionType,
  expiry: number,
  strikePrice: number,
  tradeType: LyraTradeType,
  optionAmount: BigNumber | string,
  assetIn: string
): Promise<any> {
  const strike = await getStrike(pool.network, market, expiry, strikePrice);
  const strikeId = strike.id;

  const positions = await getPositions(pool);
  const filteredPosition = positions.filter(
    e =>
      e.strikeId === strikeId &&
      e.isCall == (optionType === "call") &&
      e.state === 1
  );
  const positionId = filteredPosition.length > 0 ? filteredPosition[0].id : 0;

  let lyraOptionType = getLyraTradeOptionType(
    optionType === "call",
    tradeType === "buy"
  );
  let txFunction = "openPosition";
  if (filteredPosition.length > 0) {
    if (
      //sell long positions
      (tradeType === "sell" && filteredPosition[0].isLong) ||
      //cover short positions
      (tradeType === "buy" && !filteredPosition[0].isLong)
    ) {
      lyraOptionType = getLyraTradeOptionType(
        filteredPosition[0].isCall,
        filteredPosition[0].isLong
      );
      txFunction = "closePosition";
    }
  }

  const amountIn = ethers.BigNumber.from(optionAmount);
  const quote = await getQuote(strike, optionType, tradeType, amountIn);
  const netPremiun =
    tradeType === "buy"
      ? quote.premium.add(quote.fee)
      : quote.premium.sub(quote.fee);

  const iOptionMarketWrapper = new ethers.utils.Interface(
    IOptionMarketWrapper.abi
  );
  const tradeTx = iOptionMarketWrapper.encodeFunctionData(txFunction, [
    [
      strike.market().contractAddresses.optionMarket,
      strikeId, // strike Id
      positionId, // position Id
      1, // iteration
      0, // set collateral to
      0, // current collateral
      lyraOptionType, // optionType
      amountIn, // amount
      tradeType === "sell" ? netPremiun : 0, // min cost
      tradeType === "buy" ? netPremiun : ethers.constants.MaxUint256, // max cost
      tradeType === "buy" ? netPremiun : 0, // input amount
      assetIn // input asset
    ]
  ]);
  return tradeTx;
}
