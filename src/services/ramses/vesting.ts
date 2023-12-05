/* eslint-disable @typescript-eslint/no-explicit-any */
import { BigNumber, ethers } from "ethers";
import IXRam from "../../abi/IXRam.json";

const iXRam = new ethers.utils.Interface(IXRam.abi);

export function getCreateVestTxData(amount: BigNumber | string): string {
  return iXRam.encodeFunctionData("createVest", [amount]);
}

export function getExitVestTxData(vestId: number): string {
  return iXRam.encodeFunctionData("exitVest", [vestId, false]);
}
