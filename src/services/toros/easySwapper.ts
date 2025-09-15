import { ethers } from "ethers";
import { Dapp, Pool } from "../..";

import IEasySwapperV2 from "../../abi/IEasySwapperV2.json";
import { routerAddress } from "../../config";

import { isPool, loadPool } from "./pool";

import { getInitWithdrawalTxData } from "./initWithdrawal";

export const LOW_USD_VALUE_FOR_WITHDRAWAL = 1; // 1 USD minimum value for withdrawal
export const SLIPPAGE_FOR_LOW_VALUE_SWAP = 500;

export async function getPoolDepositAsset(
  pool: Pool,
  poolAddress: string,
  investAsset: string
): Promise<string | undefined> {
  const torosPool = await loadPool(pool, poolAddress);
  const composition = await torosPool.getComposition();
  if (
    composition.find(e => e.asset.toLowerCase() === investAsset.toLowerCase())
      ?.isDeposit
  )
    return investAsset;
  return composition.find(e => e.isDeposit)?.asset;
}

export async function getTorosPoolTokenPrice(
  pool: Pool,
  poolAddress: string
): Promise<ethers.BigNumber> {
  const torosPool = await loadPool(pool, poolAddress);
  return await torosPool.poolLogic.tokenPrice();
}

export async function getEasySwapperDepositQuote(
  pool: Pool,
  torosAsset: string,
  investAsset: string,
  amountIn: ethers.BigNumber
): Promise<ethers.BigNumber> {
  const easySwapper = new ethers.Contract(
    routerAddress[pool.network][Dapp.TOROS] as string,
    IEasySwapperV2,
    pool.signer
  );

  return await easySwapper.depositQuote(torosAsset, investAsset, amountIn);
}

export async function getEasySwapperTxData(
  pool: Pool,
  assetFrom: string,
  assetTo: string,
  amountIn: ethers.BigNumber,
  slippage: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const isWithdrawal = await isPool(pool, assetFrom);
  const [torosAsset, investAsset] = isWithdrawal
    ? [assetFrom, assetTo]
    : [assetTo, assetFrom];
  const iEasySwapperV2 = new ethers.utils.Interface(IEasySwapperV2);
  if (isWithdrawal) {
    return getInitWithdrawalTxData(
      pool,
      torosAsset,
      amountIn.toString(),
      slippage * 100,
      false
    );
  } else {
    const depositAsset = await getPoolDepositAsset(
      pool,
      torosAsset,
      investAsset
    );
    if (!depositAsset) throw new Error("no deposit assets");
    if (depositAsset.toLowerCase() !== investAsset.toLowerCase())
      throw new Error("can only trade deposit asset");
    const minAmountOut = await getEasySwapperDepositQuote(
      pool,
      torosAsset,
      investAsset,
      amountIn
    );
    return iEasySwapperV2.encodeFunctionData("depositWithCustomCooldown", [
      torosAsset,
      depositAsset,
      amountIn,
      minAmountOut.mul(10000 - slippage * 100).div(10000)
    ]);
  }
}
