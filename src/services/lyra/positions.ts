/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers, LyraOptionMarket, LyraPosition, Pool } from "../..";
import Lyra from "@lyrafinance/lyra-js";
import IOptionToken from "../../abi/IOptionToken.json";

export async function getOptionPositions(
  pool: Pool,
  market: LyraOptionMarket
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<LyraPosition[]> {
  const lyra = new Lyra();
  const optionMarket = await lyra.market(market);
  const iOptionToken = new ethers.Contract(
    optionMarket.__marketData.marketAddresses.optionToken,
    IOptionToken.abi,
    pool.signer
  );
  return await iOptionToken.getOwnerPositions(pool.address);
}
