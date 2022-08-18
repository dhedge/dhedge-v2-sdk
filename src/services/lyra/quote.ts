import { Quote, Strike } from "@lyrafinance/lyra-js";
import { ethers } from "ethers";
import { LyraOptionType, LyraTradeType } from "../../types";

export async function getQuote(
  strike: Strike,
  type: LyraOptionType,
  tradeType: LyraTradeType,
  amount: ethers.BigNumber
): Promise<Quote> {
  return await strike.quote(type === "call", tradeType === "buy", amount);
}
