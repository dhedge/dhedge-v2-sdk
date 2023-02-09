import { Pool } from "../entities";

export const getDeadline = async (pool: Pool): Promise<number> => {
  const timestamp = (await pool.signer.provider.getBlock("latest")).timestamp;
  return timestamp + 60 * 20; //add 20 min
};
