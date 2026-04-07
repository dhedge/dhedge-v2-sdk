import axios from "axios";
import { API_URL, dexIdNameMap } from "./constants";
import { BigNumber } from "bignumber.js";
import { ApiError } from "../..";

export const perpDexIndex = (assetId: number): number => {
  return Math.max(Math.floor((assetId - 100000) / 10000), 0);
};

const assetIndex = (assetId: number): number => {
  if (assetId > 100000) {
    //builder-deployed perps
    return (assetId - 100000) % 10000;
  } else return assetId;
};

export const spotAssetIndex = (assetId: number): number => {
  return assetId - 10000;
};

export const isSpotAsset = (assetId: number): boolean => {
  return assetId > 10000 && assetId < 100000;
};

export const getMidPrice = async (
  assetId: number,
  assetName: string
): Promise<number> => {
  const response = await axios.post(API_URL, {
    type: "allMids",
    dex: dexIdNameMap[perpDexIndex(assetId)]
  });
  const raw = response.data[assetName];
  if (raw === undefined || raw === null) {
    throw new ApiError(
      `Hyperliquid allMids response missing price for asset "${assetName}"`
    );
  }
  const price = +raw;
  if (isNaN(price)) {
    throw new ApiError(
      `Hyperliquid allMids returned non-numeric price for asset "${assetName}": ${raw}`
    );
  }
  return price;
};

export const getAssetInfo = async (
  assetId: number
): Promise<{
  assetName: string;
  szDecimals: number;
  baseTokenName?: string;
}> => {
  if (isSpotAsset(assetId)) {
    const response = await axios.post(API_URL, {
      type: "spotMeta"
    });
    const asset = response.data.universe.find(
      (e: { index: number }) => e.index === spotAssetIndex(assetId)
    );
    if (!asset) {
      throw new ApiError(
        `Hyperliquid spotMeta response contains no asset for assetId ${assetId} (index ${spotAssetIndex(
          assetId
        )})`
      );
    }
    const baseToken = response.data.tokens[asset.tokens[0]];
    return {
      assetName: asset.name,
      szDecimals: baseToken.szDecimals,
      baseTokenName: baseToken.name
    };
  } else {
    const response = await axios.post(API_URL, {
      type: "metaAndAssetCtxs",
      dex: dexIdNameMap[perpDexIndex(assetId)]
    });
    const assets = response.data[0].universe;
    return {
      assetName: assets[assetIndex(assetId)].name,
      szDecimals: assets[assetIndex(assetId)].szDecimals
    };
  }
};

export const calculatePrice = (
  isSpotAsset: boolean,
  szDecimals: number,
  midPrice: number,
  isBuy: boolean,
  slippage: number
): string => {
  // 1. Apply slippage
  const price = midPrice * (isBuy ? 1 + slippage / 100 : 1 - slippage / 100);

  // 2. Round to 5 significant figures
  const roundedSignificant = parseFloat(price.toPrecision(5));

  // 3. For perp base decimals = 6
  const baseDecimals = isSpotAsset ? 8 : 6;
  const finalDecimals = baseDecimals - szDecimals;
  const factor = Math.pow(10, finalDecimals);
  const roundedDecimals = Math.round(roundedSignificant * factor) / factor;
  return new BigNumber(roundedDecimals).times(1e8).toFixed(0);
};

export const calculateSize = (
  szDecimals: number,
  value: number,
  price: number
): string => {
  const factor = Math.pow(10, szDecimals);
  return new BigNumber(Math.round((value / price) * factor) / factor)
    .times(1e8)
    .toFixed(0);
};

export const scaleSize = (
  szDecimals: number,
  positionSize: number,
  percentageToClose: number
): string => {
  const factor = Math.pow(10, szDecimals);
  return new BigNumber(
    Math.round(((positionSize * percentageToClose) / 100) * factor) / factor
  )
    .times(1e8)
    .abs()
    .toFixed(0);
};
