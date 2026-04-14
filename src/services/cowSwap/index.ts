/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { ethers } from "ethers";
import { ApiError } from "../..";
import { networkChainIdMap, gpv2SettlementAddress } from "../../config";
import { Pool } from "../../entities";
import BN from "bignumber.js";

export const KIND_SELL = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("sell")
);
export const KIND_BUY = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("buy"));
export const BALANCE_ERC20 = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("erc20")
);

// Matches CowSwapOrderTypeHashLib.ORDER_TYPE_HASH exactly:
// kind/sellTokenBalance/buyTokenBalance are "string" in the type string
// but encoded as bytes32 values in abi.encode — must replicate this exactly
const ORDER_TYPE_HASH = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes(
    "Order(" +
      "address sellToken," +
      "address buyToken," +
      "address receiver," +
      "uint256 sellAmount," +
      "uint256 buyAmount," +
      "uint32 validTo," +
      "bytes32 appData," +
      "uint256 feeAmount," +
      "string kind," +
      "bool partiallyFillable," +
      "string sellTokenBalance," +
      "string buyTokenBalance" +
      ")"
  )
);

// Matches CowSwapOrderTypeHashLib.EIP712_DOMAIN_TYPEHASH
const EIP712_DOMAIN_TYPEHASH = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes(
    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
  )
);

const cowSwapApiNetworkMap: Record<string, string> = {
  polygon: "polygon"
};

const GPv2Settlement_ABI = [
  "function setPreSignature(bytes calldata orderUid, bool signed) external"
];

// Replicates CowSwapOrderTypeHashLib.hashOrder
function hashOrder(order: {
  sellToken: string;
  buyToken: string;
  receiver: string;
  sellAmount: string;
  buyAmount: string;
  validTo: number;
  appData: string;
  feeAmount: string;
  kind: string;
  partiallyFillable: boolean;
  sellTokenBalance: string;
  buyTokenBalance: string;
}): string {
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      [
        "bytes32",
        "address",
        "address",
        "address",
        "uint256",
        "uint256",
        "uint32",
        "bytes32",
        "uint256",
        "bytes32",
        "bool",
        "bytes32",
        "bytes32"
      ],
      [
        ORDER_TYPE_HASH,
        order.sellToken,
        order.buyToken,
        order.receiver,
        order.sellAmount,
        order.buyAmount,
        order.validTo,
        order.appData,
        order.feeAmount,
        order.kind,
        order.partiallyFillable,
        order.sellTokenBalance,
        order.buyTokenBalance
      ]
    )
  );
}

// Replicates CowSwapOrderTypeHashLib.domainSeparator
function computeDomainSeparator(
  name: string,
  version: string,
  chainId: number,
  verifyingContract: string
): string {
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["bytes32", "bytes32", "bytes32", "uint256", "address"],
      [
        EIP712_DOMAIN_TYPEHASH,
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name)),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(version)),
        chainId,
        verifyingContract
      ]
    )
  );
}

// Replicates CowSwapOrderTypeHashLib.getDigest
function computeOrderDigest(domainSep: string, orderHash: string): string {
  return ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ["bytes2", "bytes32", "bytes32"],
      ["0x1901", domainSep, orderHash]
    )
  );
}

export async function getCowSwapTxData(
  pool: Pool,
  assetFrom: string,
  assetTo: string,
  amountIn: ethers.BigNumber | string,
  slippage: number,
  kind: "sell" | "buy" = "sell"
): Promise<{
  encodedTypedData: string;
  preSignTxData: string;
  minAmountOut: string;
}> {
  const chainId = networkChainIdMap[pool.network];
  const network = cowSwapApiNetworkMap[pool.network];
  if (!network) {
    throw new Error(`CowSwap is not supported on network: ${pool.network}`);
  }

  const gpv2Settlement = gpv2SettlementAddress[pool.network];
  if (!gpv2Settlement) {
    throw new Error(
      `GPv2Settlement address not configured for network: ${pool.network}`
    );
  }

  const baseUrl = `https://api.cow.fi/${network}/api/v1`;

  // 1. Get quote
  let quoteResponse: any;
  try {
    const quoteResult = await axios.post(`${baseUrl}/quote`, {
      sellToken: assetFrom,
      buyToken: assetTo,
      ...(kind === "sell"
        ? { sellAmountBeforeFee: amountIn.toString() }
        : { buyAmountAfterFee: amountIn.toString() }),
      from: pool.address,
      receiver: pool.address,
      kind,
      signingScheme: "presign",
      partiallyFillable: false,
      sellTokenBalance: "erc20",
      buyTokenBalance: "erc20"
    });
    quoteResponse = quoteResult.data;
  } catch (e) {
    throw new ApiError("CowSwap quote request failed");
  }

  const { sellAmount, buyAmount, validTo } = quoteResponse.quote;

  const buyAmountWithSlippage = ethers.BigNumber.from(
    new BN(buyAmount.toString())
      .times(new BN(1).minus(new BN(slippage).div(100)))
      .toFixed(0, BN.ROUND_DOWN)
  );

  const orderValues = {
    sellToken: assetFrom,
    buyToken: assetTo,
    receiver: pool.address,
    sellAmount,
    buyAmount: buyAmountWithSlippage.toString(),
    validTo,
    appData: ethers.constants.HashZero,
    feeAmount: "0",
    kind: kind === "sell" ? KIND_SELL : KIND_BUY,
    partiallyFillable: false,
    sellTokenBalance: BALANCE_ERC20,
    buyTokenBalance: BALANCE_ERC20
  };

  // 2. Compute digest matching CowSwapOrderTypeHashLib.getDigest exactly
  const domainSep = computeDomainSeparator(
    "Gnosis Protocol",
    "v2",
    chainId,
    gpv2Settlement
  );
  const orderHash = hashOrder(orderValues);
  const orderDigest = computeOrderDigest(domainSep, orderHash);

  // orderUid = abi.encodePacked(orderDigest, owner, validTo) — 32 + 20 + 4 = 56 bytes
  const orderUid = ethers.utils.solidityPack(
    ["bytes32", "address", "uint32"],
    [orderDigest, pool.address, validTo]
  );

  // 3. Submit order to CowSwap API — solver waits for on-chain presign before executing
  try {
    await axios.post(`${baseUrl}/orders`, {
      sellToken: assetFrom,
      buyToken: assetTo,
      receiver: pool.address,
      sellAmount,
      buyAmount: buyAmountWithSlippage.toString(),
      validTo,
      appData: ethers.constants.HashZero,
      feeAmount: "0",
      kind,
      partiallyFillable: false,
      signingScheme: "presign",
      signature: pool.address,
      sellTokenBalance: "erc20",
      buyTokenBalance: "erc20",
      from: pool.address,
      quoteId: quoteResponse.id
    });
  } catch (e) {
    throw new ApiError("CowSwap order submission failed");
  }

  // 4. Encode CowSwapTypedData for submit() on TypedStructuredDataValidator
  const typedData = {
    domain: {
      name: "Gnosis Protocol",
      version: "v2",
      chainId,
      verifyingContract: gpv2Settlement
    },
    order: orderValues
  };

  const encodedTypedData = ethers.utils.defaultAbiCoder.encode(
    [
      "tuple(" +
        "tuple(string name, string version, uint256 chainId, address verifyingContract) domain," +
        "tuple(address sellToken, address buyToken, address receiver, uint256 sellAmount, uint256 buyAmount, uint32 validTo, bytes32 appData, uint256 feeAmount, bytes32 kind, bool partiallyFillable, bytes32 sellTokenBalance, bytes32 buyTokenBalance) order" +
        ")"
    ],
    [typedData]
  );

  // 5. Encode setPreSignature() — guard checks isValidatedHash(pool, orderDigest)
  const settlementIface = new ethers.utils.Interface(GPv2Settlement_ABI);
  const preSignTxData = settlementIface.encodeFunctionData("setPreSignature", [
    orderUid,
    true
  ]);

  return {
    encodedTypedData,
    preSignTxData,
    minAmountOut: buyAmountWithSlippage.toString()
  };
}
