/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dapp, ethers, Network, Pool } from "../..";
import { networkChainIdMap, routerAddress } from "../../config";
import { retry } from "./retry";
import AaveLendingPoolAssetGuardAbi from "../../abi/IAaveLendingPoolAssetGuard.json";
import IEasySwapperV2 from "../../abi/IEasySwapperV2.json";
import { loadPool } from "./pool";
import { getSwapDataViaOdos, SWAPPER_ADDERSS } from "./swapData";
const COMPLEX_ASSET_ONCHAIN_SWAP_SLIPPAGE = 150; // 1.5% slippage for onchain swap in complex asset withdrawal

// Returns addresses of complex assets that require off-chain swap data during withdrawal.
// Add new complex asset dapps here as they are integrated.
const getComplexAssetAddresses = (network: Network): string[] => {
  const addresses: string[] = [];
  const aaveAddress = routerAddress[network]?.[Dapp.AAVEV3];
  if (aaveAddress) addresses.push(aaveAddress);
  const dytmAddress = routerAddress[network]?.[Dapp.DYTM];
  if (dytmAddress) addresses.push(dytmAddress);
  return addresses;
};

const getCalculateSwapDataParams = async (
  pool: Pool,
  dappAddress: string,
  torosAsset: string,
  amountIn: string,
  slippage: number
): Promise<{
  offchainSwapNeeded: boolean;
  swapDataParams: any;
}> => {
  const assetGuardAddress = await pool.factory.getAssetGuard(dappAddress);

  const assetGuard = new ethers.Contract(
    assetGuardAddress,
    AaveLendingPoolAssetGuardAbi,
    pool.signer
  );
  const swapDataParams = await assetGuard.callStatic.calculateSwapDataParams(
    torosAsset,
    amountIn,
    slippage
  );

  return {
    offchainSwapNeeded: swapDataParams.srcData.length !== 0,
    swapDataParams
  };
};

const getComplexAssetWithdrawData = async (
  pool: Pool,
  swapDataParams: any,
  slippage: number
) => {
  const { srcData, dstData } = swapDataParams;

  const srcDataToEncode: unknown[] = [];
  const routerKey = ethers.utils.formatBytes32String("ODOS_V3");
  for (const { asset, amount } of srcData) {
    const swapData = await retry({
      fn: () => {
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
        slippageTolerance: COMPLEX_ASSET_ONCHAIN_SWAP_SLIPPAGE
      };
    });
  }

  // for off-chain swap
  const complexAssetAddresses = getComplexAssetAddresses(pool.network);

  return Promise.all(
    supportedAssets.map(async assetObj => {
      const complexAssetDappAddress = complexAssetAddresses.find(
        addr => addr.toLowerCase() === assetObj.asset.toLowerCase()
      );
      if (complexAssetDappAddress) {
        const {
          offchainSwapNeeded,
          swapDataParams
        } = await getCalculateSwapDataParams(
          pool,
          complexAssetDappAddress,
          torosAsset,
          amountIn,
          slippage
        );
        if (offchainSwapNeeded) {
          const withdrawData = await getComplexAssetWithdrawData(
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
): Promise<{ swapTxData: string; minAmountOut?: any }> => {
  const complexAssetsData = await createWithdrawTxArguments(
    pool,
    torosAsset,
    amountIn,
    slippage,
    useOnChainSwap
  );
  const iEasySwapperV2 = new ethers.utils.Interface(IEasySwapperV2);

  return {
    swapTxData: iEasySwapperV2.encodeFunctionData("initWithdrawal", [
      torosAsset,
      amountIn,
      complexAssetsData
    ]),
    minAmountOut: null // not be used when building multicall tx data
  };
};
