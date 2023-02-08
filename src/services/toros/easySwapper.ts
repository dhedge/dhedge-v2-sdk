import { ethers } from "ethers";
import { Dapp, Pool } from "../..";

import IDhedgeEasySwapper from "../../abi/IDhedgeEasySwapper.json";
import { routerAddress } from "../../config";
import { getChainlinkPriceInUsd } from "../chainLink/price";
import { isPool, loadPool } from "./pool";

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
  depositAsset: string,
  amountIn: ethers.BigNumber
): Promise<ethers.BigNumber> {
  const easySwapper = new ethers.Contract(
    routerAddress[pool.network][Dapp.TOROS] as string,
    IDhedgeEasySwapper.abi,
    pool.signer
  );

  return await easySwapper.depositQuote(
    torosAsset,
    investAsset,
    amountIn,
    depositAsset,
    true
  );
}

export async function getEasySwapperWithdrawalQuote(
  pool: Pool,
  torosAsset: string,
  investAsset: string,
  amountIn: ethers.BigNumber
): Promise<ethers.BigNumber> {
  const [torosTokenPrice, assetPrice, assetDecimals] = await Promise.all([
    getTorosPoolTokenPrice(pool, torosAsset),
    getChainlinkPriceInUsd(pool, investAsset),
    pool.utils.getDecimals(investAsset)
  ]);

  return amountIn
    .mul(torosTokenPrice)
    .div(assetPrice)
    .div(1e10)
    .div(10 ** (18 - assetDecimals));
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
  const iDhedgeEasySwapper = new ethers.utils.Interface(IDhedgeEasySwapper.abi);
  if (isWithdrawal) {
    const minAmountOut = await getEasySwapperWithdrawalQuote(
      pool,
      torosAsset,
      investAsset,
      amountIn
    );
    return iDhedgeEasySwapper.encodeFunctionData("withdraw", [
      torosAsset,
      amountIn,
      investAsset,
      minAmountOut.mul(10000 - slippage * 100).div(10000)
    ]);
  } else {
    const depositAsset = await getPoolDepositAsset(
      pool,
      torosAsset,
      investAsset
    );
    if (!depositAsset) throw new Error("no deposit assets");
    const minAmountOut = await getEasySwapperDepositQuote(
      pool,
      torosAsset,
      investAsset,
      depositAsset,
      amountIn
    );
    return iDhedgeEasySwapper.encodeFunctionData("depositWithCustomCooldown", [
      torosAsset,
      investAsset,
      amountIn,
      depositAsset,
      minAmountOut.mul(10000 - slippage * 100).div(10000)
    ]);
  }
}
