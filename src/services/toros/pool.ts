import { Dhedge, Pool } from "../..";

export async function loadPool(pool: Pool, poolAddress: string): Promise<Pool> {
  const dhedge = new Dhedge(pool.signer, pool.network);
  return await dhedge.loadPool(poolAddress);
}

export async function isPool(
  pool: Pool,
  poolAddress: string
): Promise<boolean> {
  const dhedge = new Dhedge(pool.signer, pool.network);
  return await dhedge.validatePool(poolAddress);
}
