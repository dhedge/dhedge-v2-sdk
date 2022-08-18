/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers, LyraOptionMarket, Network } from "../..";
import { lyraNetworkMap } from "../../config";
import Lyra, { Board, Strike } from "@lyrafinance/lyra-js";

export async function getBoard(
  network: Network,
  market: LyraOptionMarket,
  expiry: number
): Promise<Board> {
  const lyra = new Lyra(lyraNetworkMap[network]);
  const optionMarket = await lyra.market(market);
  const filteredBoards = optionMarket
    .liveBoards()
    .filter(e => e.expiryTimestamp === expiry);
  if (filteredBoards.length === 0) throw new Error("no lyra board for expiry");
  return filteredBoards[0];
}

export async function getExpiries(
  network: Network,
  market: LyraOptionMarket
): Promise<number[]> {
  const lyra = new Lyra(lyraNetworkMap[network]);
  const optionMarket = await lyra.market(market);
  return optionMarket.liveBoards().map(e => e.expiryTimestamp);
}

export async function getStrikes(
  network: Network,
  market: LyraOptionMarket,
  expiry: number
): Promise<Strike[]> {
  return (await getBoard(network, market, expiry)).strikes();
}

export async function getStrike(
  network: Network,
  market: LyraOptionMarket,
  expiry: number,
  strike: number
): Promise<Strike> {
  const strikes = await getStrikes(network, market, expiry);
  const filteredStrike = strikes.filter(
    (e: Strike) =>
      parseFloat(ethers.utils.formatEther(e.strikePrice)) === strike
  );
  if (filteredStrike.length === 0)
    throw new Error("no option found for strike price");

  return filteredStrike[0];
}
