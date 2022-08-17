/* eslint-disable @typescript-eslint/no-explicit-any */
import IOptionMarket from "../../abi/IOptionMarket.json";
import { ethers, LyraOptionMarket, Network } from "../..";
import { lyraOptionMarkets } from "../../config";
import { Wallet } from "ethers";
import Lyra, { Deployment } from "@lyrafinance/lyra-js";

export async function testLyra(): Promise<any> {
  const lyra = new Lyra(Deployment.Kovan);
  // Fetch all markets
  const market = await lyra.market("eth");
  console.log(
    "market",
    market.__marketData.exchangeParams.spotPrice.toString()
  );
  return market;
}

export async function getExpiries(
  market: LyraOptionMarket,
  network: Network,
  signer: Wallet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<number[]> {
  const iOptionMarket = new ethers.Contract(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    lyraOptionMarkets[network]![market],
    IOptionMarket.abi,
    signer
  );
  const boardIds = await iOptionMarket.getLiveBoards();
  const result = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    boardIds.map((e: any) => iOptionMarket.getOptionBoard(e))
  );

  return result.map((e: any) => e.expiry.toNumber());
}

export async function getOptionStrike(
  market: LyraOptionMarket,
  strike: number,
  expiry: number,
  network: Network,
  signer: Wallet
): Promise<any> {
  const strikes = await getOptionStrikes(market, expiry, network, signer);
  const filteredStrike = strikes.filter((e: number) => e === strike);
  if (filteredStrike.length === 0)
    throw new Error("no option found for provided strike");

  return filteredStrike[0];
}

export async function getOptionStrikes(
  market: LyraOptionMarket,
  expiry: number,
  network: Network,
  signer: Wallet
): Promise<any> {
  const iOptionMarket = new ethers.Contract(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    lyraOptionMarkets[network]![market],
    IOptionMarket.abi,
    signer
  );
  const boardIds = await iOptionMarket.getLiveBoards();
  const result = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    boardIds.map((e: any) => iOptionMarket.getBoardAndStrikeDetails(e))
  );
  const filteredBoard: any[] = result.filter(
    (e: any) => e[0].expiry.toNumber() === expiry
  );

  if (filteredBoard.length === 0)
    throw new Error("no option found for provided expiry");

  return filteredBoard[0][1].map((e: any) =>
    parseFloat(ethers.utils.formatEther(e.strikePrice))
  );
}
