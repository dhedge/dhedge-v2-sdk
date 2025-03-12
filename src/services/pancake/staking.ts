/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from "ethers";
import INonfungiblePositionManager from "../../abi/INonfungiblePositionManager.json";
import IPanncakeMasterChef from "../../abi/IPancakeMasterChefV3.json";
import { Pool } from "../../entities";
import { Transaction } from "../../types";
import { MaxUint128 } from "../../config";
const iNonfungiblePositionManager = new ethers.utils.Interface(
  INonfungiblePositionManager.abi
);
const iMasterChef = new ethers.utils.Interface(IPanncakeMasterChef);

export function getPancakeStakeTxData(
  pool: Pool,
  tokenId: string,
  stakingAddress: string
): string {
  return iNonfungiblePositionManager.encodeFunctionData("safeTransferFrom", [
    pool.address,
    stakingAddress,
    tokenId
  ]);
}

export function getPancakeUnStakeTxData(pool: Pool, tokenId: string): string {
  return iMasterChef.encodeFunctionData("withdraw", [tokenId, pool.address]);
}

export function getPancakeHarvestClaimTxData(
  pool: Pool,
  tokenId: string
): string {
  const harvestTxData = iMasterChef.encodeFunctionData(Transaction.HARVEST, [
    tokenId,
    pool.address
  ]);
  const collectTxData = iMasterChef.encodeFunctionData(Transaction.COLLECT, [
    [tokenId, pool.address, MaxUint128, MaxUint128]
  ]);

  const multicallParams = [harvestTxData, collectTxData];

  return iMasterChef.encodeFunctionData(Transaction.MULTI_CALL, [
    multicallParams
  ]);
}
