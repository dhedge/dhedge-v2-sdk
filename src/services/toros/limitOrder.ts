/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from "ethers";
import { Pool } from "../..";
import { limitOrderAddress } from "../../config";
import { LimitOrderInfo } from "../../types";
import IPoolLimitOrderManager from "../../abi/toros/IPoolLimitOrderManager.json";

const iface = new ethers.utils.Interface(IPoolLimitOrderManager);

export function getLimitOrderId(
  userAddress: string,
  vaultAddress: string
): string {
  return ethers.utils.solidityKeccak256(
    ["address", "address"],
    [userAddress, vaultAddress]
  );
}

export function getCreateLimitOrderTxData(info: LimitOrderInfo): string {
  return iface.encodeFunctionData("createLimitOrder", [
    [
      info.amount,
      info.stopLossPriceD18,
      info.takeProfitPriceD18,
      info.user,
      info.pool,
      info.pricingAsset
    ]
  ]);
}

export function getModifyLimitOrderTxData(info: LimitOrderInfo): string {
  return iface.encodeFunctionData("modifyLimitOrder", [
    [
      info.amount,
      info.stopLossPriceD18,
      info.takeProfitPriceD18,
      info.user,
      info.pool,
      info.pricingAsset
    ]
  ]);
}

export function getDeleteLimitOrderTxData(vaultAddress: string): string {
  return iface.encodeFunctionData("deleteLimitOrder", [vaultAddress]);
}

export async function getTorosLimitOrder(
  pool: Pool,
  userAddress: string,
  vaultAddress: string
): Promise<LimitOrderInfo | null> {
  const managerAddress = limitOrderAddress[pool.network];
  if (!managerAddress) return null;

  const orderId = getLimitOrderId(userAddress, vaultAddress);
  const contract = new ethers.Contract(
    managerAddress,
    IPoolLimitOrderManager,
    pool.signer
  );

  const result = await contract.limitOrders(orderId);
  // If amount is zero, the order doesn't exist
  if (result.amount.isZero()) return null;

  return {
    amount: result.amount,
    stopLossPriceD18: result.stopLossPriceD18,
    takeProfitPriceD18: result.takeProfitPriceD18,
    user: result.user,
    pool: result.pool,
    pricingAsset: result.pricingAsset
  };
}

export async function hasActiveTorosLimitOrder(
  pool: Pool,
  userAddress: string,
  vaultAddress: string
): Promise<boolean> {
  const order = await getTorosLimitOrder(pool, userAddress, vaultAddress);
  return order !== null;
}
