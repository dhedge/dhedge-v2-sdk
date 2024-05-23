/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from "ethers";
import IVelodromeRouter from "../../abi/IVeldodromeRouter.json";
import IVelodromeCLGauge from "../../abi/IVelodromeCLGauge.json";
import { Pool } from "../../entities";
import { Dapp, Transaction } from "../../types";
import { getDeadline } from "../../utils/deadline";
import { getUniswapV3Liquidity } from "../uniswap/V3Liquidity";
import { nonfungiblePositionManagerAddress } from "../../config";
import INonfungiblePositionManager from "../../abi/INonfungiblePositionManager.json";

export async function getVelodromeAddLiquidityTxData(
  pool: Pool,
  assetA: string,
  assetB: string,
  amountA: ethers.BigNumber | string,
  amountB: ethers.BigNumber | string,
  isStable: boolean
): Promise<any> {
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
    await getDeadline(pool)
  ]);
}

export async function getVelodromeRemoveLiquidityTxData(
  pool: Pool,
  assetA: string,
  assetB: string,
  amount: ethers.BigNumber | string,
  isStable: boolean
): Promise<any> {
  const iVelodromeRouter = new ethers.utils.Interface(IVelodromeRouter.abi);
  return iVelodromeRouter.encodeFunctionData(Transaction.REMOVE_LIQUIDITY, [
    assetA,
    assetB,
    isStable,
    amount,
    "0",
    "0",
    pool.address,
    await getDeadline(pool)
  ]);
}

export async function getVelodromeCLDecreaseStakedLiquidityTxData(
  pool: Pool,
  tokenId: string,
  amount: number
): Promise<any> {
  const abi = new ethers.utils.Interface(IVelodromeCLGauge.abi);
  const liquidity = (
    await getUniswapV3Liquidity(Dapp.VELODROMECL, tokenId, pool)
  )
    .times(amount)
    .div(100);

  return abi.encodeFunctionData("decreaseStakedLiquidity", [
    tokenId,
    liquidity.toFixed(0),
    0,
    0,
    await getDeadline(pool)
  ]);
}

export async function getVelodromeCLIncreaseStakedLiquidityTxData(
  pool: Pool,
  tokenId: string,
  amountA: ethers.BigNumber | string,
  amountB: ethers.BigNumber | string
): Promise<any> {
  const abi = new ethers.utils.Interface(IVelodromeCLGauge.abi);
  return abi.encodeFunctionData("increaseStakedLiquidity", [
    tokenId,
    amountA,
    amountB,
    0,
    0,
    await getDeadline(pool)
  ]);
}

export async function getVelodromeCLIncreaseLiquidityTxData(
  pool: Pool,
  tokenId: string,
  amountA: ethers.BigNumber | string,
  amountB: ethers.BigNumber | string
): Promise<any> {
  const abi = new ethers.utils.Interface(IVelodromeCLGauge.abi);
  return abi.encodeFunctionData("increaseStakedLiquidity", [
    tokenId,
    amountA,
    amountB,
    0,
    0,
    await getDeadline(pool)
  ]);
}

export async function getVelodromeClOwner(
  pool: Pool,
  tokenId: string
): Promise<string> {
  const iNonfungiblePositionManager = new ethers.Contract(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    nonfungiblePositionManagerAddress[pool.network][Dapp.VELODROMECL]!,
    INonfungiblePositionManager.abi,
    pool.signer
  );
  return await iNonfungiblePositionManager.ownerOf(tokenId);
}
