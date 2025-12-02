/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dapp, ethers, Pool } from "../..";
import { networkChainIdMap, routerAddress } from "../../config";
import IEasySwapperV2 from "../../abi/IEasySwapperV2.json";
import BigNumber from "bignumber.js";
import AssetHandlerAbi from "../../abi/AssetHandler.json";
import IERC20Abi from "../../abi/IERC20.json";
import {
  LOW_USD_VALUE_FOR_WITHDRAWAL,
  SLIPPAGE_FOR_LOW_VALUE_SWAP
} from "./easySwapper";
import { retry } from "./retry";
import { getSwapDataViaOdos, SWAPPER_ADDERSS } from "./swapData";

export interface TrackedAsset {
  token: string;
  balance: ethers.BigNumber | string;
}

const getSwapWithdrawData = async (
  pool: Pool,
  trackedAssets: TrackedAsset[],
  receiveToken: string,
  slippage: number
) => {
  const srcData = [];
  const routerKey = ethers.utils.formatBytes32String("ODOS_V2");
  // const destData
  for (const { token, balance } of trackedAssets) {
    if (token.toLowerCase() === receiveToken.toLowerCase()) {
      continue;
    }
    const swapData = await retry({
      fn: () => {
        return getSwapDataViaOdos({
          srcAsset: token,
          srcAmount: balance.toString(),
          dstAsset: receiveToken,
          chainId: networkChainIdMap[pool.network],
          from: SWAPPER_ADDERSS,
          receiver: SWAPPER_ADDERSS,
          slippage
        });
      },
      delayMs: 1500,
      maxRetries: 7
    });
    srcData.push({
      token,
      amount: balance,
      aggregatorData: { routerKey, swapData }
    });
  }
  return {
    srcData,
    destData: {
      destToken: receiveToken,
      minDestAmount: "0"
    }
  };
};

export const createCompleteWithdrawalTxArguments = async (
  pool: Pool,
  receiveToken: string,
  slippage: number,
  _trackedAssets: TrackedAsset[]
): Promise<any> => {
  const easySwapper = new ethers.Contract(
    routerAddress[pool.network][Dapp.TOROS] as string,
    IEasySwapperV2,
    pool.signer
  );

  let trackedAssets: TrackedAsset[] = _trackedAssets;
  if (trackedAssets.length === 0) {
    trackedAssets = await easySwapper.getTrackedAssets(pool.address);
  }

  if (
    trackedAssets.length === 0 ||
    trackedAssets.every(
      ({ token }) => token.toLowerCase() === receiveToken.toLowerCase()
    )
  ) {
    // just do simple complete withdraw
    return {
      isSwapNeeded: false,
      swapData: null,
      estimatedMinReceiveAmount: null
    };
  }

  const swapTrackedAssets = trackedAssets.filter(
    ({ token }) => token.toLowerCase() !== receiveToken.toLowerCase()
  );

  const assetHandlerAddress = await pool.factory.callStatic.getAssetHandler();
  const assetHandler = new ethers.Contract(
    assetHandlerAddress,
    AssetHandlerAbi.abi,
    pool.signer
  );
  const receiveTokenPriceD18 = new BigNumber(
    (await assetHandler.getUSDPrice(receiveToken)).toString()
  );
  const receiveTokenErc20 = await new ethers.Contract(
    receiveToken,
    IERC20Abi.abi,
    pool.signer
  );
  const receiveTokenDecimals = await receiveTokenErc20.decimals();
  // swap dest minDestAmount
  const tAssetInfos = await Promise.all(
    swapTrackedAssets.map(async swapTAsset => {
      const swapTAssetPriceD18 = new BigNumber(
        (await assetHandler.getUSDPrice(swapTAsset.token)).toString()
      );
      const swapTAssetTokenErc20 = await new ethers.Contract(
        swapTAsset.token,
        IERC20Abi.abi,
        pool.signer
      );
      const swapTAssetDecimals = await swapTAssetTokenErc20.decimals();
      const tokenBalanceBN = new BigNumber(swapTAsset.balance.toString());
      const estimatedValueToSwapD0 = tokenBalanceBN
        .times(swapTAssetPriceD18)
        .div(10 ** 18)
        .div(10 ** Number(swapTAssetDecimals.toString()));

      // --- caution: if the estimated value to swap is less than the low USD value for withdrawal, use a higher slippage
      const adjustedSlippage = estimatedValueToSwapD0.lte(
        LOW_USD_VALUE_FOR_WITHDRAWAL
      )
        ? SLIPPAGE_FOR_LOW_VALUE_SWAP
        : slippage;
      // -----

      const estimatedMinReceiveAmount = tokenBalanceBN
        .times(swapTAssetPriceD18)
        .div(receiveTokenPriceD18)
        .div(10 ** Number(swapTAssetDecimals.toString()))
        .times(10 ** Number(receiveTokenDecimals.toString()))
        .times(1 - adjustedSlippage / 10000) // slippage is in basis points, so divide by 10000
        .decimalPlaces(0, BigNumber.ROUND_DOWN);

      return {
        token: swapTAsset.token,
        balance: swapTAsset.balance,
        estimatedMinReceiveAmount
      };
    })
  );
  const swapDestMinDestAmount = tAssetInfos.reduce(
    (acc, { estimatedMinReceiveAmount }) => acc.plus(estimatedMinReceiveAmount),
    new BigNumber(0)
  );

  const withdrawalVaultAddress = await easySwapper.withdrawalContracts(
    pool.address
  );
  const balanceOfReceiveToken = await receiveTokenErc20.balanceOf(
    withdrawalVaultAddress
  );

  // complete withdraw _expectedDestTokenAmount
  const estimatedMinReceiveAmount = swapDestMinDestAmount.plus(
    balanceOfReceiveToken.toString()
  );

  const swapData = await getSwapWithdrawData(
    pool,
    swapTrackedAssets,
    receiveToken,
    slippage
  );

  return {
    isSwapNeeded: true,
    swapData,
    estimatedMinReceiveAmount: estimatedMinReceiveAmount.toFixed(0)
  };
};

export const getCompleteWithdrawalTxData = async (
  pool: Pool,
  receiveToken: string,
  slippage: number,
  useOnChainSwap: boolean,
  trackedAssets: TrackedAsset[]
): Promise<string> => {
  const completeWithdrawTxArguments = await createCompleteWithdrawalTxArguments(
    pool,
    receiveToken,
    slippage,
    trackedAssets
  );

  const isSwapNeeded = completeWithdrawTxArguments.isSwapNeeded;
  const isOffchainSwap = !useOnChainSwap && isSwapNeeded;
  const iEasySwapperV2 = new ethers.utils.Interface(IEasySwapperV2);
  if (isOffchainSwap) {
    return iEasySwapperV2.encodeFunctionData(
      "completeWithdrawal(((address,uint256,(bytes32,bytes))[],(address,uint256)),uint256)",
      [
        completeWithdrawTxArguments.swapData,
        completeWithdrawTxArguments.estimatedMinReceiveAmount
      ]
    );
  } else {
    return iEasySwapperV2.encodeFunctionData("completeWithdrawal()");
  }
};
