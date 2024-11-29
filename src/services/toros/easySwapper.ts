import { ethers } from "ethers";
import { Dapp, Pool } from "../..";

import IDhedgeEasySwapper from "../../abi/IDhedgeEasySwapper.json";
import { routerAddress } from "../../config";
import { getChainlinkPriceInUsd } from "../chainLink/price";
import { isPool, loadPool } from "./pool";
import { getOneInchSwapTxData } from "../oneInch";
import { wait } from "../../test/utils/testingHelper";

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
    IDhedgeEasySwapper,
    pool.signer
  );

  return await easySwapper.depositQuote(torosAsset, investAsset, amountIn);
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
  const iDhedgeEasySwapper = new ethers.utils.Interface(IDhedgeEasySwapper);
  if (isWithdrawal) {
    return iDhedgeEasySwapper.encodeFunctionData("initWithdrawal", [
      torosAsset,
      amountIn,
      slippage * 100
    ]);
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
    return iDhedgeEasySwapper.encodeFunctionData("depositWithCustomCooldown", [
      torosAsset,
      depositAsset,
      amountIn,
      minAmountOut.mul(10000 - slippage * 100).div(10000)
    ]);
  }
}

export async function getCompleteWithdrawalTxData(
  pool: Pool,
  destToken: string,
  slippage: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<string> {
  const easySwapper = new ethers.Contract(
    routerAddress[pool.network][Dapp.TOROS] as string,
    IDhedgeEasySwapper,
    pool.signer
  );
  const trackedAssets: {
    token: string;
    balance: ethers.BigNumber;
  }[] = await easySwapper.getTrackedAssets(pool.address);
  const trackedAssetsExcludingDestToken = trackedAssets.filter(
    ({ token }) => token.toLowerCase() !== destToken.toLowerCase()
  );

  const srcData = [];
  let minDestAmount = ethers.BigNumber.from(0);
  for (const { token, balance } of trackedAssetsExcludingDestToken) {
    const { swapTxData, dstAmount } = await getOneInchSwapTxData(
      pool,
      token,
      destToken,
      balance,
      slippage,
      true
    );
    srcData.push({
      token,
      amount: balance,
      aggregatorData: {
        routerKey: ethers.utils.formatBytes32String("ONE_INCH"),
        swapData: swapTxData
      }
    });
    minDestAmount = minDestAmount.add(dstAmount);
    await wait(2);
  }

  return easySwapper.interface.encodeFunctionData("completeWithdrawal", [
    {
      srcData,
      destData: {
        destToken,
        minDestAmount
      }
    },
    minDestAmount.mul(10000 - slippage * 100).div(10000)
  ]);
}
