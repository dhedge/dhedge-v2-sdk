/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dapp, ethers, Pool } from "../..";
import { routerAddress } from "../../config";
import IEasySwapperV2 from "../../abi/IEasySwapperV2.json";
import BigNumber from "bignumber.js";
import AssetHandlerAbi from "../../abi/AssetHandler.json";
import IERC20Abi from "../../abi/IERC20.json";
import {
  LOW_USD_VALUE_FOR_WITHDRAWAL,
  SLIPPAGE_FOR_LOW_VALUE_SWAP
} from "./easySwapper";
import { retry } from "./retry";
import { getSwapData, ROUTER_KEYS } from "./swapData";

export interface TrackedAsset {
  token: string;
  balance: ethers.BigNumber;
}

const getSwapWithdrawData = async (
  pool: Pool,
  trackedAssets: {
    token: string;
    balance: ethers.BigNumber;
    slippage: number;
  }[],
  receiveToken: string,
  swapDestMinDestAmount: BigNumber
) => {
  for (const routerKeyString of ROUTER_KEYS) {
    try {
      const srcData = [];
      const routerKey = ethers.utils.formatBytes32String(routerKeyString);
      for (const { token, balance, slippage } of trackedAssets) {
        if (token.toLowerCase() === receiveToken.toLowerCase()) {
          continue;
        }
        const swapData = await retry({
          fn: () => {
            return getSwapData(
              pool,
              {
                srcAsset: token,
                srcAmount: balance.toString(),
                dstAsset: receiveToken,
                slippage
              },
              routerKeyString
            );
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
          minDestAmount: swapDestMinDestAmount.toString()
        }
      };
    } catch {
      continue;
    }
  }
  throw new Error("All swap routers failed for complete withdrawal");
};
export const createCompleteWithdrawalTxArguments = async (
  pool: Pool,
  receiveToken: string,
  slippage: number
): Promise<any> => {
  const easySwapper = new ethers.Contract(
    routerAddress[pool.network][Dapp.TOROS] as string,
    IEasySwapperV2,
    pool.signer
  );
  const trackedAssets: TrackedAsset[] = await easySwapper.getTrackedAssets(
    pool.address
  );

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
        // Outer floor stays strict on the user slippage — this is the
        // withdrawer's safety check. Dust leniency applies only to the
        // aggregator calldata below.
        .times(1 - slippage / 10000) // slippage is in basis points, so divide by 10000
        .decimalPlaces(0, BigNumber.ROUND_DOWN);

      return {
        token: swapTAsset.token,
        balance: swapTAsset.balance,
        slippage: adjustedSlippage,
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
    tAssetInfos.map(({ token, balance, slippage }) => ({
      token,
      balance,
      slippage
    })),
    receiveToken,
    swapDestMinDestAmount
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
  useOnChainSwap: boolean
): Promise<string> => {
  const completeWithdrawTxArguments = await createCompleteWithdrawalTxArguments(
    pool,
    receiveToken,
    slippage
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
