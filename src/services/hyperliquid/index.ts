import { ethers } from "ethers";
import ICoreDepositWalletAbi from "../../abi/hyperliquid/ICoreDepositWallet.json";
import ICoreWriterAbi from "../../abi/hyperliquid/ICoreWriter.json";
import {
  HYPERLIQUID_VERSION,
  LIMIT_ORDER_ACTION,
  LIMIT_ORDER_TIF_IOC,
  SEND_ASSET_ACTION,
  SPOT_DEX_ID,
  SPOT_SEND_ACTION,
  USDC_CORE_ADDRESS,
  USDC_TOKEN_ID
} from "./constants";

import {
  calculatePrice,
  calculateSize,
  getAssetInfo,
  getMidPrice,
  isSpotAsset
} from "./marketData";

const depositWallet = new ethers.utils.Interface(ICoreDepositWalletAbi);
const coreWriter = new ethers.utils.Interface(ICoreWriterAbi);

export const getDepositHyperliquidTxData = (
  dexId: number,
  amount: ethers.BigNumber | string
): string => {
  return depositWallet.encodeFunctionData("deposit", [amount, dexId]);
};

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
export const getPerpToSpotHyperliquidTxData = (
  dexId: number,
  receiver: string,
  amount: ethers.BigNumber | string
): string => {
  const coreAmount = ethers.BigNumber.from(amount).mul(100); //USDC on Core has two more decimals
  //From Perp to Spot
  const innerEncoded = ethers.utils.defaultAbiCoder.encode(
    //destination, subAccount, sourceDex, destinationDex, token, amount
    ["address", "address", "uint32", "uint32", "uint64", "uint64"],
    [
      receiver,
      ethers.constants.AddressZero,
      dexId,
      SPOT_DEX_ID,
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

export const getLimitOrderHyperliquidTxData = async (
  assetId: number,
  isLong: boolean,
  changeAmount: number,
  slippage: number
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

  console.log(`Placing limit order on asset ${assetName} (id: ${assetId}): 
    isBuy: ${isBuy}, 
    price: ${price}, 
    size: ${size}, 
    reduceOnly: ${reduceOnly}`);

  const innerEncoded = ethers.utils.defaultAbiCoder.encode(
    //assetIndex, isBuy, price, size, reduceOnly, tif, clientOrderId
    ["uint32", "bool", "uint64", "uint64", "bool", "uint8", "uint128"],
    [
      assetId,
      isBuy,
      price,
      size,
      reduceOnly,
      LIMIT_ORDER_TIF_IOC, // immediate or cancel
      ethers.BigNumber.from(0) //client order id
    ]
  );

  const rawTXData = ethers.utils.solidityPack(
    ["uint8", "uint24", "bytes"],
    [HYPERLIQUID_VERSION, LIMIT_ORDER_ACTION, innerEncoded]
  );

  return coreWriter.encodeFunctionData("sendRawAction", [rawTXData]);
};
