import { ethers } from "../..";
import ICompoundV3Comet from "../../abi/compound/ICompoundV3Comet.json";

export function getCompoundV3LendTxData(
  asset: string,
  amount: ethers.BigNumber | string
): string {
  return new ethers.utils.Interface(
    ICompoundV3Comet
  ).encodeFunctionData("supply", [asset, amount]);
}

export function getCompoundV3WithdrawTxData(
  asset: string,
  amount: ethers.BigNumber | string
): string {
  return new ethers.utils.Interface(
    ICompoundV3Comet
  ).encodeFunctionData("withdraw", [asset, amount]);
}
