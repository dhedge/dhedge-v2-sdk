import { ethers } from "ethers";
import ICoreDepositWalletAbi from "../../abi/hyperliquid/ICoreDepositWallet.json";
import ICoreWriterAbi from "../../abi/hyperliquid/ICoreWriter.json";
import {
  CLOID_CANCEL_ACTION,
  HYPERLIQUID_VERSION,
  LIMIT_ORDER_ACTION,
  LIMIT_ORDER_TIF_ALO,
  LIMIT_ORDER_TIF_GTC,
  LIMIT_ORDER_TIF_IOC,
  OID_CANCEL_ACTION,
  SEND_ASSET_ACTION,
  SPOT_SEND_ACTION,
  USDC_CORE_ADDRESS,
  USDC_TOKEN_ID
} from "./constants";

import {
  calculatePrice,
  calculateSize,
  getAssetInfo,
  getMidPrice,
  isSpotAsset,
  scaleSize
} from "./marketData";
import { getPositionSize } from "./positionData";

const depositWallet = new ethers.utils.Interface(ICoreDepositWalletAbi);
const coreWriter = new ethers.utils.Interface(ICoreWriterAbi);

/** Encode `deposit(amount, dexId)` on the Hyperliquid CoreDepositWallet to bridge USDC into HyperCore. */
export const getDepositHyperliquidTxData = (
  dexId: number,
  amount: ethers.BigNumber | string
): string => {
  return depositWallet.encodeFunctionData("deposit", [amount, dexId]);
};

/**
 * Encode a CoreWriter `sendRawAction` for SPOT_SEND that bridges USDC from the
 * HyperCore Spot wallet back to EVM. Amount is supplied in 6 decimals (EVM USDC) and
 * scaled up by 100 for HyperCore's 8-decimal USDC.
 */
export const getWithdrawSpotHyperliquidTxData = (
  amount: ethers.BigNumber | string
): string => {
  const coreAmount = ethers.BigNumber.from(amount).mul(100); //USDC on Core has two more decimals
  //Hardcoded to USDC address and id on Hyperliquid Core
  //From Spot to EVM
  const innerEncoded = ethers.utils.defaultAbiCoder.encode(
    //to, token, amount
    ["address", "uint64", "uint64"],
    [USDC_CORE_ADDRESS, USDC_TOKEN_ID, coreAmount]
  );

  const rawTXData = ethers.utils.solidityPack(
    ["uint8", "uint24", "bytes"],
    [HYPERLIQUID_VERSION, SPOT_SEND_ACTION, innerEncoded]
  );
  return coreWriter.encodeFunctionData("sendRawAction", [rawTXData]);
};
/**
 * Encode a CoreWriter `sendRawAction` for SEND_ASSET that moves USDC between
 * HyperCore dexes (perp/spot/xyz). Amount is supplied in 6 decimals (EVM USDC) and
 * scaled to HyperCore's 8 decimals.
 */
export const getSendAssetHyperliquidTxData = (
  sourceDex: number,
  destinationDex: number,
  receiver: string,
  amount: ethers.BigNumber | string
): string => {
  // Convert 6-decimal EVM USDC to 8-decimal HyperCore USDC (spot, main perp, and xyz)
  // Transfer USDC between dexes (perp, spot, xyz)
  const coreAmount = ethers.BigNumber.from(amount).mul(100);
  //From Perp to Spot
  const innerEncoded = ethers.utils.defaultAbiCoder.encode(
    //destination, subAccount, sourceDex, destinationDex, token, amount
    ["address", "address", "uint32", "uint32", "uint64", "uint64"],
    [
      receiver,
      ethers.constants.AddressZero,
      sourceDex,
      destinationDex,
      USDC_TOKEN_ID,
      coreAmount
    ]
  );

  const rawTXData = ethers.utils.solidityPack(
    ["uint8", "uint24", "bytes"],
    [HYPERLIQUID_VERSION, SEND_ASSET_ACTION, innerEncoded]
  );

  return coreWriter.encodeFunctionData("sendRawAction", [rawTXData]);
};

const normalizeCloid = (cloid: string | number = 0): ethers.BigNumber => {
  const clientOrderId = cloid || 0;
  const isValidCloid =
    typeof clientOrderId === "number"
      ? Number.isSafeInteger(clientOrderId) && clientOrderId >= 0
      : ethers.utils.isHexString(clientOrderId, 16);
  if (!isValidCloid) {
    throw new Error(
      "cloid must be a non-negative safe integer or a 16-byte hex string"
    );
  }

  return ethers.BigNumber.from(clientOrderId.toString());
};

/** Encode a CoreWriter `sendRawAction` for a LIMIT_ORDER action. */
const encodeLimitOrder = (
  assetId: number,
  isBuy: boolean,
  price: string,
  size: string,
  reduceOnly: boolean,
  tif: number,
  cloid: string | number = 0
): string => {
  const innerEncoded = ethers.utils.defaultAbiCoder.encode(
    //assetIndex, isBuy, price, size, reduceOnly, tif, clientOrderId
    ["uint32", "bool", "uint64", "uint64", "bool", "uint8", "uint128"],
    [
      assetId,
      isBuy,
      price,
      size,
      reduceOnly,
      tif,
      normalizeCloid(cloid) //client order id
    ]
  );

  const rawTXData = ethers.utils.solidityPack(
    ["uint8", "uint24", "bytes"],
    [HYPERLIQUID_VERSION, LIMIT_ORDER_ACTION, innerEncoded]
  );

  return coreWriter.encodeFunctionData("sendRawAction", [rawTXData]);
};

/**
 * Encode a CoreWriter `sendRawAction` for an IOC limit order on a Hyperliquid asset.
 * Auto-flips side and sets `reduceOnly` when `changeAmount` is negative (perp close).
 * Price is offset by `slippage`% from the current mid in the direction of execution.
 * Optional `cloid` is a non-negative safe integer or a 16-byte hex string.
 * Falsy values encode 0 (no client order ID).
 */
export const getLimitOrderHyperliquidTxData = async (
  assetId: number,
  isLong: boolean,
  changeAmount: number,
  slippage: number,
  cloid: string | number = 0
): Promise<string> => {
  let isBuy = isLong;
  let reduceOnly = false;
  if (changeAmount < 0) {
    changeAmount = changeAmount * -1;
    isBuy = !isLong;
    reduceOnly = !isSpotAsset(assetId);
  }

  //Calculate price with slippage
  const { assetName, szDecimals } = await getAssetInfo(assetId);
  const midPrice = await getMidPrice(assetId, assetName);
  const price = calculatePrice(
    isSpotAsset(assetId),
    szDecimals,
    midPrice,
    isBuy,
    slippage
  );
  const size = calculateSize(szDecimals, changeAmount, midPrice);

  return encodeLimitOrder(
    assetId,
    isBuy,
    price,
    size,
    reduceOnly,
    LIMIT_ORDER_TIF_IOC,
    cloid
  );
};

export type HyperliquidRestingTif = "GTC" | "ALO";

/**
 * Encode a CoreWriter `sendRawAction` for a resting (GTC or ALO) limit order at an
 * absolute `limitPrice`, e.g. a perp buy below market or a take-profit sell above it.
 * Side/reduceOnly follow the same convention as `getLimitOrderHyperliquidTxData`:
 * a negative `changeAmount` flips the side and sets `reduceOnly` for perps.
 * `changeAmount` is a USD value converted to size at `limitPrice`.
 * The dHEDGE CoreWriter guard rejects resting spot buys, so they are rejected here too.
 * Optional `cloid` is a non-negative safe integer or a 16-byte hex string.
 * Falsy values encode 0 (no client order ID).
 */
export const getRestingLimitOrderHyperliquidTxData = async (
  assetId: number,
  isLong: boolean,
  changeAmount: number,
  limitPrice: number,
  tif: HyperliquidRestingTif,
  cloid: string | number = 0
): Promise<string> => {
  if (!(limitPrice > 0)) throw new Error("limitPrice must be positive");

  let isBuy = isLong;
  let reduceOnly = false;
  if (changeAmount < 0) {
    changeAmount = changeAmount * -1;
    isBuy = !isLong;
    reduceOnly = !isSpotAsset(assetId);
  }
  if (isBuy && isSpotAsset(assetId)) {
    throw new Error("Resting spot buy orders are not supported");
  }

  const { szDecimals } = await getAssetInfo(assetId);
  // Zero slippage: only applies Hyperliquid's price rounding rules
  const price = calculatePrice(
    isSpotAsset(assetId),
    szDecimals,
    limitPrice,
    isBuy,
    0
  );
  const size = calculateSize(szDecimals, changeAmount, limitPrice);
  if (size === "0") throw new Error("Order size rounds to zero");

  return encodeLimitOrder(
    assetId,
    isBuy,
    price,
    size,
    reduceOnly,
    tif === "ALO" ? LIMIT_ORDER_TIF_ALO : LIMIT_ORDER_TIF_GTC,
    cloid
  );
};

/**
 * Encode a CoreWriter `sendRawAction` that cancels an open order by its
 * Hyperliquid order id (oid), as returned by the `openOrders` info endpoint.
 */
export const getCancelOrderHyperliquidTxData = (
  assetId: number,
  oid: number | string
): string => {
  const innerEncoded = ethers.utils.defaultAbiCoder.encode(
    //assetIndex, oid
    ["uint32", "uint64"],
    [assetId, oid]
  );

  const rawTXData = ethers.utils.solidityPack(
    ["uint8", "uint24", "bytes"],
    [HYPERLIQUID_VERSION, OID_CANCEL_ACTION, innerEncoded]
  );

  return coreWriter.encodeFunctionData("sendRawAction", [rawTXData]);
};

/** Encode a CoreWriter `sendRawAction` that cancels an order by its nonzero client order ID. */
export const getCancelOrderByCloidHyperliquidTxData = (
  assetId: number,
  cloid: string | number
): string => {
  const clientOrderId = normalizeCloid(cloid);
  if (clientOrderId.isZero()) {
    throw new Error("cloid must be non-zero for cancellation");
  }

  const innerEncoded = ethers.utils.defaultAbiCoder.encode(
    ["uint32", "uint128"],
    [assetId, clientOrderId]
  );
  const rawTXData = ethers.utils.solidityPack(
    ["uint8", "uint24", "bytes"],
    [HYPERLIQUID_VERSION, CLOID_CANCEL_ACTION, innerEncoded]
  );

  return coreWriter.encodeFunctionData("sendRawAction", [rawTXData]);
};

/**
 * Encode a CoreWriter `sendRawAction` for an IOC limit order that closes
 * `percentageToClose`% of the pool's current Hyperliquid position. Reads the
 * existing position size on-chain to determine the side (buy to close shorts,
 * sell to close longs).
 * Optional `cloid` is a non-negative safe integer or a 16-byte hex string.
 * Falsy values encode 0 (no client order ID).
 */
export const getClosePositionHyperliquidTxData = async (
  assetId: number,
  percentageToClose: number,
  slippage: number,
  poolAddress: string,
  cloid: string | number = 0
): Promise<string> => {
  const isSpot = isSpotAsset(assetId);
  const { assetName, szDecimals, baseTokenName } = await getAssetInfo(assetId);
  const positionSize = await getPositionSize(
    assetId,
    isSpot,
    baseTokenName ?? assetName,
    poolAddress
  );
  const isBuy = positionSize < 0; // if position size is negative, we need to buy to close, otherwise sell
  const sizeRaw = scaleSize(szDecimals, positionSize, percentageToClose);

  //Calculate price with slippage
  const midPrice = await getMidPrice(assetId, assetName);
  const price = calculatePrice(
    isSpotAsset(assetId),
    szDecimals,
    midPrice,
    isBuy,
    slippage
  );

  return encodeLimitOrder(
    assetId,
    isBuy,
    price,
    sizeRaw,
    !isSpot,
    LIMIT_ORDER_TIF_IOC,
    cloid
  );
};
