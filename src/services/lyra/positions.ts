/* eslint-disable @typescript-eslint/no-explicit-any */
import { Pool } from "../..";
import { lyraNetworkMap } from "../../config";
import Lyra, { Position } from "@lyrafinance/lyra-js";

export async function getPositions(pool: Pool): Promise<Position[]> {
  const lyra = new Lyra(lyraNetworkMap[pool.network]);
  return await lyra.openPositions(pool.address);
}
