/* eslint-disable @typescript-eslint/no-explicit-any */
import IOptionToken from "../../abi/IOptionToken.json";
import { ethers, Pool } from "../..";

export async function getOptionPositions(
  pool: Pool,
  optionToken: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const iOptionToken = new ethers.Contract(
    optionToken,
    IOptionToken.abi,
    pool.signer
  );

  return await iOptionToken.getOwnerPositions(pool.address);
}
