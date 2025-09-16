/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dapp, ethers, Pool } from "../..";
import { networkChainIdMap, routerAddress } from "../../config";
import { retry } from "./retry";
import AaveLendingPoolAssetGuardAbi from "../../abi/IAaveLendingPoolAssetGuard.json";
import IEasySwapperV2 from "../../abi/IEasySwapperV2.json";
import { loadPool } from "./pool";
import { getSwapDataViaOdos, SWAPPER_ADDERSS } from "./swapData";
const AAVE_WITHDRAW_ONCHAIN_SWAP_SLIPPAGE = 150; // 1.5% slippage for onchain swap in Aave withdrawal

const getCalculateSwapDataParams = async (
  pool: Pool,
  torosAsset: string,
  amountIn: string,
  slippage: number
): Promise<{
  offchainSwapNeeded: boolean;
  swapDataParams: any;
}> => {
  const aaveAssetGuardAddress = await pool.factory.getAssetGuard(
    routerAddress[pool.network][Dapp.AAVEV3] as string
  );

  const aaveAssetGuard = new ethers.Contract(
    aaveAssetGuardAddress,
    AaveLendingPoolAssetGuardAbi,
    pool.signer
  );
  const swapDataParams = await aaveAssetGuard.callStatic.calculateSwapDataParams(
    torosAsset,
    amountIn,
    slippage
  );

  console.log("swapDataParams from asset guard", swapDataParams);

  return {
    offchainSwapNeeded: swapDataParams.srcData.length !== 0,
    swapDataParams
  };
};

const getAaveAssetWithdrawData = async (
  pool: Pool,
  swapDataParams: any,
  slippage: number
) => {
  const { srcData, dstData } = swapDataParams;

  const srcDataToEncode: unknown[] = [];
  const routerKey = ethers.utils.formatBytes32String("ODOS_V2");
  for (const { asset, amount } of srcData) {
    console.log("src");
    const swapData = await retry({
      fn: () => {
        console.log(
          "Fetching Odos swap data...",
          asset,
          amount.toString(),
          dstData.asset,
          slippage
        );
        return getSwapDataViaOdos({
          srcAsset: asset,
          srcAmount: amount.toString(),
          dstAsset: dstData.asset,
          chainId: networkChainIdMap[pool.network],
          from: SWAPPER_ADDERSS,
          receiver: SWAPPER_ADDERSS,
          slippage
        });
      },
      delayMs: 1500,
      maxRetries: 7
    });
    srcDataToEncode.push([asset, amount, [routerKey, swapData]]);

    console.log("swapData from Odos", swapData);
    console.log("routerKey", routerKey);
  }
  const coder = ethers.utils.defaultAbiCoder;

  const encodedSrcData = coder.encode(
    ["tuple(address, uint256, tuple(bytes32, bytes))[]"],
    [srcDataToEncode]
  );
  const withdrawData = coder.encode(
    ["tuple(bytes, tuple(address, uint256), uint256)"],
    [[encodedSrcData, [dstData.asset, dstData.amount], slippage]]
  );

  return withdrawData;
};

export const createWithdrawTxArguments = async (
  pool: Pool,
  torosAsset: string,
  amountIn: string,
  slippage: number,
  useOnChainSwap: boolean
): Promise<any> => {
  const torosPool = await loadPool(pool, torosAsset);
  const supportedAssets: {
    asset: string;
  }[] = await torosPool.managerLogic.getSupportedAssets();

  if (useOnChainSwap) {
    return supportedAssets.map(assetObj => {
      return {
        supportedAsset: assetObj.asset,
        withdrawData: "0x",
        slippageTolerance: AAVE_WITHDRAW_ONCHAIN_SWAP_SLIPPAGE
      };
    });
  }

  // for off-chain swap
  const aaveLendingPoolAddress = routerAddress[pool.network][
    Dapp.AAVEV3
  ] as string;
  return Promise.all(
    supportedAssets.map(async assetObj => {
      if (
        assetObj.asset.toLowerCase() === aaveLendingPoolAddress.toLowerCase()
      ) {
        const {
          offchainSwapNeeded,
          swapDataParams
        } = await getCalculateSwapDataParams(
          pool,
          torosAsset,
          amountIn,
          slippage
        );
        if (offchainSwapNeeded) {
          const withdrawData = await getAaveAssetWithdrawData(
            pool,
            swapDataParams,
            slippage
          );

          return {
            supportedAsset: assetObj.asset,
            withdrawData,
            slippageTolerance: slippage
          };
        }
      }

      return {
        supportedAsset: assetObj.asset,
        withdrawData: "0x",
        slippageTolerance: slippage
      };
    })
  );
};

export const getInitWithdrawalTxData = async (
  pool: Pool,
  torosAsset: string,
  amountIn: string,
  slippage: number,
  useOnChainSwap: boolean
): Promise<string> => {
  const complexAssetsData = await createWithdrawTxArguments(
    pool,
    torosAsset,
    amountIn,
    slippage,
    useOnChainSwap
  );
  console.log("complexAssetsData", complexAssetsData);
  const iEasySwapperV2 = new ethers.utils.Interface(IEasySwapperV2);
  return iEasySwapperV2.encodeFunctionData("initWithdrawal", [
    torosAsset,
    amountIn,
    complexAssetsData
  ]);
};
