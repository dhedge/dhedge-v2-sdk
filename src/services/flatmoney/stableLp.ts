/* eslint-disable @typescript-eslint/no-explicit-any */

import BigNumber from "bignumber.js";
import { Pool, SDKOptions, ethers } from "../..";
import DelayedOrderAbi from "../../abi/flatmoney/DelayedOrder.json";
import IOrderExecutionModuleAbi from "../../abi/flatmoney/v2/IOrderExecutionModule.json";
import { flatMoneyContractAddresses } from "../../config";
import {
  getPoolTxOrGasEstimate,
  isSdkOptionsBoolean
} from "../../utils/contract";
import { getStableDepositQuote, getStableWithdrawQuote } from "./stableModule";
import { getKeeperFee } from "./keeperFee";

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

export function getCancelExistingOrderTxDataForV2(account: string): string {
  return new ethers.utils.Interface(
    IOrderExecutionModuleAbi
  ).encodeFunctionData("cancelExistingOrder", [account]);
}

export async function mintUnitViaFlatMoney(
  pool: Pool,
  depositAmount: ethers.BigNumber | string,
  slippage: number, // 0.5 means 0.5%
  maxKeeperFeeInUsd: number | null,
  options: any = null,
  sdkOptions: SDKOptions = {
    estimateGas: false
  }
): Promise<any> {
  const flatMoneyContracts = flatMoneyContractAddresses[pool.network];
  if (!flatMoneyContracts) {
    throw new Error("mintUnitViaFlatMoney: network not supported");
  }

  const keeperfee = await getKeeperFee(pool, maxKeeperFeeInUsd); // in COLLATERAL

  const adjustedDepositAmount = new BigNumber(depositAmount.toString()).minus(
    keeperfee.toString() // keeper fee deducted from amountIn
  );

  const amountOut = await getStableDepositQuote(
    pool,
    adjustedDepositAmount.toFixed(0)
  );
  const minAmountOut = new BigNumber(amountOut.toString())
    .times(1 - slippage / 100)
    .toFixed(0);

  const mintUnitTxData = await getAnnounceStableDepositTxData(
    adjustedDepositAmount.toFixed(0),
    minAmountOut,
    keeperfee
  );

  const tx = await getPoolTxOrGasEstimate(
    pool,
    [flatMoneyContracts.DelayedOrder, mintUnitTxData, options],
    sdkOptions
  );
  return tx;
}

export async function redeemUnitViaFlatMoney(
  pool: Pool,
  withdrawAmount: ethers.BigNumber | string,
  slippage: number, // 0.5 means 0.5%
  maxKeeperFeeInUsd: number | null,
  options: any = null,
  sdkOptions: SDKOptions = {
    estimateGas: false
  }
): Promise<any> {
  const flatMoneyContracts = flatMoneyContractAddresses[pool.network];
  if (!flatMoneyContracts) {
    throw new Error("redeemUnitViaFlatMoney: network not supported");
  }
  const keeperfee = await getKeeperFee(pool, maxKeeperFeeInUsd); // in RETH

  const amountOut = await getStableWithdrawQuote(pool, withdrawAmount);
  const minAmountOut = new BigNumber(amountOut.toString())
    .times(1 - slippage / 100)
    .minus(keeperfee.toString()) // keeper fee deducted from amountOut
    .toFixed(0);

  const redeemUnitTxData = await getAnnounceStableWithdrawTxData(
    withdrawAmount,
    minAmountOut,
    keeperfee
  );
  const tx = await getPoolTxOrGasEstimate(
    pool,
    [flatMoneyContracts.DelayedOrder, redeemUnitTxData, options],
    sdkOptions
  );
  return tx;
}

export async function cancelOrderViaFlatMoney(
  pool: Pool,
  options: any = null,
  sdkOptions: SDKOptions = {
    estimateGas: false
  }
): Promise<any> {
  const flatMoneyContracts = flatMoneyContractAddresses[pool.network];
  if (!flatMoneyContracts) {
    throw new Error("cancelOrderViaFlatMoney: network not supported");
  }
  // flat money v2
  // use OrderExecution module to cancel order
  let toAddress = flatMoneyContracts.DelayedOrder;
  let cancelOrderTxData = getCancelExistingOrderTxData(pool.address);
  if (flatMoneyContracts.OrderExecution) {
    toAddress = flatMoneyContracts.OrderExecution;
    cancelOrderTxData = await getCancelExistingOrderTxDataForV2(pool.address);
  }
  const tx = await getPoolTxOrGasEstimate(
    pool,
    [toAddress, cancelOrderTxData, options],
    {
      ...(isSdkOptionsBoolean(sdkOptions)
        ? { estimateGas: sdkOptions }
        : sdkOptions),
      useTraderAddressAsFrom: true
    }
  );
  return tx;
}
