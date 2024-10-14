/* eslint-disable @typescript-eslint/no-explicit-any */
import { BigNumber, ethers } from "ethers";
import IXRam from "../../abi/IXRam.json";
import IRamsesNonfungiblePositionManager from "../../abi/IRamsesNonfungiblePositionManager.json";

const iXRam = new ethers.utils.Interface(IXRam.abi);
const iRamsesNonfungiblePositionManager = new ethers.utils.Interface(
  IRamsesNonfungiblePositionManager
);

export function getCreateVestTxData(amount: BigNumber | string): string {
  return iXRam.encodeFunctionData("createVest", [amount]);
}

export function getExitVestTxData(vestId: number): string {
  return iXRam.encodeFunctionData("exitVest", [vestId, false]);
}

export function getRewardsTxDta(tokenId: string, rewards: string[]): string {
  return iRamsesNonfungiblePositionManager.encodeFunctionData("getReward", [
    tokenId,
    rewards
  ]);
}
