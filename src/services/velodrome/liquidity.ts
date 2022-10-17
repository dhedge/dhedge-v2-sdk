/* eslint-disable @typescript-eslint/no-explicit-any */
import { BigNumber, ethers } from "ethers";
import IVelodromeRouter from "../../abi/IVeldodromeRouter.json";
import { deadline } from "../../config";
import { Pool } from "../../entities";
import { Transaction } from "../../types";

export function getVelodromeAddLiquidityTxData(
  pool: Pool,
  assetA: string,
  assetB: string,
  amountA: BigNumber | string,
  amountB: BigNumber | string,
  isStable: boolean
): any {
  const iVelodromeRouter = new ethers.utils.Interface(IVelodromeRouter.abi);
  return iVelodromeRouter.encodeFunctionData(Transaction.ADD_LIQUIDITY, [
    assetA,
    assetB,
    isStable,
    amountA,
    amountB,
    "0",
    "0",
    pool.address,
    deadline
  ]);
}

export function getVelodromeRemoveLiquidityTxData(
  pool: Pool,
  assetA: string,
  assetB: string,
  amount: BigNumber | string,
  isStable: boolean
): any {
  const iVelodromeRouter = new ethers.utils.Interface(IVelodromeRouter.abi);
  return iVelodromeRouter.encodeFunctionData(Transaction.REMOVE_LIQUIDITY, [
    assetA,
    assetB,
    isStable,
    amount,
    "0",
    "0",
    pool.address,
    deadline
  ]);
}
