/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from "ethers";
import INonfungiblePositionManager from "../../abi/INonfungiblePositionManager.json";
import IPanncakeMasterChef from "../../abi/IPancakeMasterChefV3.json";
import { stakingAddress } from "../../config";
import { Pool } from "../../entities";
import { Dapp } from "../../types";
const iNonfungiblePositionManager = new ethers.utils.Interface(
  INonfungiblePositionManager.abi
);
const iMasterChef = new ethers.utils.Interface(IPanncakeMasterChef);

export function getPancakeStakeTxData(pool: Pool, tokenId: string): string {
  return iNonfungiblePositionManager.encodeFunctionData("safeTransferFrom", [
    pool.address,
    stakingAddress[pool.network][Dapp.PANCAKECL],
    tokenId
  ]);
}

export function getPancakeUnStakeTxData(pool: Pool, tokenId: string): string {
  return iMasterChef.encodeFunctionData("withdraw", [tokenId, pool.address]);
}
