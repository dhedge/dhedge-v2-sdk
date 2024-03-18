/* eslint-disable @typescript-eslint/no-explicit-any */

import BigNumber from "bignumber.js";
import { Pool, ethers } from "../..";
import DelayedOrderAbi from "../../abi/flatmoney/DelayedOrder.json";
import IKeeperFeeAbi from "../../abi/flatmoney/IKeeperFee.json";
import { flatMoneyContractAddresses } from "../../config";
import { getPoolTxOrGasEstimate } from "../../utils/contract";
import { getStableDepositQuote, getStableWithdrawQuote } from "./stableModule";

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
  withdrawAmount: ethers.BigNumber | string,
  minAmountOut: ethers.BigNumber | string,
  keeperFee: ethers.BigNumber | string
): string {
  return new ethers.utils.Interface(
    DelayedOrderAbi
  ).encodeFunctionData("announceStableWithdraw", [
    withdrawAmount,
    minAmountOut,
    keeperFee
  ]);
}

export function getCancelExistingOrderTxData(account: string): string {
  return new ethers.utils.Interface(
    DelayedOrderAbi
  ).encodeFunctionData("cancelExistingOrder", [account]);
}

const getKeeperFee = async (
  pool: Pool,
  keeperFeeContractAddress: string
): Promise<ethers.BigNumber> => {
  const keeperFeeContract = new ethers.Contract(
    keeperFeeContractAddress,
    IKeeperFeeAbi,
    pool.signer
  );
  const keeperfee = await keeperFeeContract.getKeeperFee();

  return keeperfee;
};

export async function mintUnitViaFlatMoney(
  pool: Pool,
  depositAmount: ethers.BigNumber | string,
  slippage: number, // 0.5 means 0.5%
  options: any = null,
  estimateGas = false
): Promise<any> {
  const flatMoneyContracts = flatMoneyContractAddresses[pool.network];
  if (!flatMoneyContracts) {
    throw new Error("mintUnitViaFlatMoney: network not supported");
  }

  const keeperfee = await getKeeperFee(pool, flatMoneyContracts.KeeperFee);

  const amountOut = await getStableDepositQuote(pool, depositAmount);
  const minAmountOut = new BigNumber(amountOut.toString())
    .times(1 - slippage / 100)
    .toFixed(0);

  const mintUnitTxData = await getAnnounceStableDepositTxData(
    depositAmount,
    minAmountOut,
    keeperfee
  );

  const tx = await getPoolTxOrGasEstimate(
    pool,
    [flatMoneyContracts.DelayedOrder, mintUnitTxData, options],
    estimateGas
  );
  return tx;
}

export async function redeemUnitViaFlatMoney(
  pool: Pool,
  withdrawAmount: ethers.BigNumber | string,
  slippage: number, // 0.5 means 0.5%
  options: any = null,
  estimateGas = false
): Promise<any> {
  const flatMoneyContracts = flatMoneyContractAddresses[pool.network];
  if (!flatMoneyContracts) {
    throw new Error("redeemUnitViaFlatMoney: network not supported");
  }
  const keeperfee = await getKeeperFee(pool, flatMoneyContracts.KeeperFee);

  const amountOut = await getStableWithdrawQuote(pool, withdrawAmount);
  const minAmountOut = new BigNumber(amountOut.toString())
    .times(1 - slippage / 100)
    .toFixed(0);

  const redeemUnitTxData = await getAnnounceStableWithdrawTxData(
    withdrawAmount,
    minAmountOut,
    keeperfee
  );
  const tx = await getPoolTxOrGasEstimate(
    pool,
    [flatMoneyContracts.DelayedOrder, redeemUnitTxData, options],
    estimateGas
  );
  return tx;
}

export async function cancelOrderViaFlatMoney(
  pool: Pool,
  options: any = null,
  estimateGas = false
): Promise<any> {
  const flatMoneyContracts = flatMoneyContractAddresses[pool.network];
  if (!flatMoneyContracts) {
    throw new Error("cancelOrderViaFlatMoney: network not supported");
  }
  const cancelOrderTxData = await getCancelExistingOrderTxData(pool.address);
  const tx = await getPoolTxOrGasEstimate(
    pool,
    [flatMoneyContracts.DelayedOrder, cancelOrderTxData, options],
    estimateGas
  );
  return tx;
}
