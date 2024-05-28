/* eslint-disable @typescript-eslint/no-explicit-any */
import { BigNumber, ethers } from "ethers";
import { Pool } from "../..";
import { LyraOptionMarket, LyraOptionType, LyraTradeType } from "../../types";
import { getStrike } from "./markets";
import IOptionMarketWrapper from "../../abi/IOptionMarketWrapper.json";
import { getLyraTradeOptionType, isCall, isLong } from "./tradeOptionType";
import { getOptionPositions } from "./positions";
import { getQuote } from "./quote";

export async function getLyraOptionTxData(
  pool: Pool,
  market: LyraOptionMarket,
  optionType: LyraOptionType,
  expiry: number,
  strikePrice: number,
  tradeType: LyraTradeType,
  optionAmount: BigNumber | string,
  assetIn: string,
  collateralAmount: BigNumber,
  isCoveredCall: boolean
): Promise<string> {
  const strike = await getStrike(pool.network, market, expiry, strikePrice);
  const strikeId = strike.id;

  const positions = await getOptionPositions(pool, market);
  const filteredPosition = positions.filter(
    e =>
      e.strikeId.toNumber() === strikeId &&
      isCall(e.optionType) === (optionType === "call") &&
      e.state === 1
  );
  const positionId =
    filteredPosition.length > 0 ? filteredPosition[0].positionId : 0;

  let lyraOptionType = getLyraTradeOptionType(
    optionType === "call",
    tradeType === "buy",
    isCoveredCall
  );

  const amountIn = BigNumber.from(optionAmount);
  const quote = await getQuote(strike, optionType, tradeType, amountIn);
  const netPremiun =
    tradeType === "buy"
      ? quote.premium.add(quote.fee)
      : quote.premium.sub(quote.fee);

  let txFunction = "openPosition";
  let inputAmount = tradeType === "buy" ? netPremiun : collateralAmount;
  let currentCollateral = BigNumber.from(0);
  let setCollateral = collateralAmount;
  if (filteredPosition.length > 0) {
    currentCollateral = filteredPosition[0].collateral ?? BigNumber.from(0);
    setCollateral = currentCollateral.add(collateralAmount);
    if (
      //sell long positions
      (tradeType === "sell" && isLong(filteredPosition[0].optionType)) ||
      //cover short positions
      (tradeType === "buy" && !isLong(filteredPosition[0].optionType))
    ) {
      lyraOptionType = filteredPosition[0].optionType;
      txFunction = "closePosition";
      setCollateral = currentCollateral.sub(collateralAmount);
      //cover short
      if (!isLong(filteredPosition[0].optionType) && isCoveredCall) {
        inputAmount = netPremiun;
      } else {
        inputAmount = BigNumber.from(0);
      }
    }
  }

  const iOptionMarketWrapper = new ethers.utils.Interface(
    IOptionMarketWrapper.abi
  );

  const tradeTx = iOptionMarketWrapper.encodeFunctionData(txFunction, [
    [
      strike.market().contractAddresses.optionMarket,
      strikeId, // strike Id
      positionId, // position Id
      1, // iteration
      setCollateral, // set collateral to
      currentCollateral, // current collateral
      lyraOptionType, // optionType
      amountIn, // amount
      tradeType === "sell" ? netPremiun : 0, // min cost
      tradeType === "buy" ? netPremiun : ethers.constants.MaxUint256, // max cost
      inputAmount,
      assetIn // input asset
    ]
  ]);
  return tradeTx;
}
