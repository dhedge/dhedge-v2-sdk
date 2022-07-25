/* eslint-disable @typescript-eslint/no-explicit-any */
import IOptionMarket from "../../abi/IOptionMarket.json";
import { ethers, LyraOptionMarket, Network } from "../..";
import { lyraOptionMarkets } from "../../config";
import { Wallet } from "ethers";

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

  return result.map(e => e[1].toNumber());
}

export async function getStrike(
  market: LyraOptionMarket,
  strike: number,
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
  const filteredBoard = result.filter(e => e[0][1].toNumber() === expiry);
  if (filteredBoard.length === 0)
    throw new Error("no option found for provided expiry");

  const filteredStrike = filteredBoard[0][1].filter(
    (e: any) => parseFloat(ethers.utils.formatEther(e[1])) === strike
  );
  if (filteredStrike.length === 0)
    throw new Error("no option found for provided strike");

  return filteredStrike[0];
}
