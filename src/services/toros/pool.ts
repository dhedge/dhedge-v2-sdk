import { Dhedge, Pool } from "../..";

export async function loadTorosPool(
  pool: Pool,
  poolAddress: string
): Promise<Pool> {
  const dhedge = new Dhedge(pool.signer, pool.network);
  return await dhedge.loadPool(poolAddress);
}

export async function isTorosPool(
  pool: Pool,
  poolAddress: string
): Promise<boolean> {
  const dhedge = new Dhedge(pool.signer, pool.network);
  return await dhedge.validatePool(poolAddress);
}
