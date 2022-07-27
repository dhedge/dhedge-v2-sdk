/* eslint-disable @typescript-eslint/no-explicit-any */
import IOptionToken from "../../abi/IOptionToken.json";
import { ethers, LyraOptionMarket, Pool } from "../..";
import { lyraOptionToken } from "../../config";

export async function getOptionPositions(
  pool: Pool,
  market: LyraOptionMarket
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const iOptionToken = new ethers.Contract(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    lyraOptionToken[pool.network]![market],
    IOptionToken.abi,
    pool.signer
  );

  return await iOptionToken.getOwnerPositions(pool.address);
}
