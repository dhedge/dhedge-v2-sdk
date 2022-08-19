/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from "ethers";
import { Dapp } from "../../types";
import IAaveV3Incentives from "../../abi/IAaveV3Incentives.json";
import { Pool } from "../..";
import { getAaveAssetsForUnderlying } from "./assets";

export async function getAaveV3ClaimTxData(
  pool: Pool,
  assets: string[],
  rewardAsset: string
): Promise<any> {
  const iAaveIncentives = new ethers.utils.Interface(IAaveV3Incentives.abi);
  const aaveAsset = await getAaveAssetsForUnderlying(pool, Dapp.AAVEV3, assets);

  const claimTxData = iAaveIncentives.encodeFunctionData("claimRewards", [
    aaveAsset,
    ethers.constants.MaxUint256,
    pool.address,
    rewardAsset
  ]);
  console.log(claimTxData);
  return claimTxData;
}
