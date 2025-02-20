import { ethers } from "ethers";
import ICometRewards from "../../abi/compound/ICometRewards.json";
import { Pool } from "../..";

export function getCompoundV3ClaimTxData(pool: Pool, asset: string): string {
  const iCometRewards = new ethers.utils.Interface(ICometRewards);

  return iCometRewards.encodeFunctionData("claim", [asset, pool.address, true]);
}
