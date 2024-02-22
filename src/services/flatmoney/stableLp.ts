import { ethers } from "../..";
import DelayedOrderAbi from "../../abi/flatmoney/DelayedOrder.json";

export function getAnnounceStableDepositTxData(
  depositAmount: ethers.BigNumber | string,
  minAmountOut: ethers.BigNumber | string,
  keeperFee: ethers.BigNumber | string
): string {
  return new ethers.utils.Interface(
    DelayedOrderAbi
  ).encodeFunctionData("announceStableDeposit", [
    depositAmount,
    minAmountOut,
    keeperFee
  ]);
}

export function getAnnounceStableWithdrawTxData(
  depositAmount: ethers.BigNumber | string,
  minAmountOut: ethers.BigNumber | string,
  keeperFee: ethers.BigNumber | string
): string {
  return new ethers.utils.Interface(
    DelayedOrderAbi
  ).encodeFunctionData("announceStableWithdraw", [
    depositAmount,
    minAmountOut,
    keeperFee
  ]);
}

export function getCancelExistingOrderTxData(account: string): string {
  return new ethers.utils.Interface(
    DelayedOrderAbi
  ).encodeFunctionData("cancelExistingOrder", [account]);
}
