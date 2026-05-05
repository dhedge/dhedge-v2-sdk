import axios from "axios";
import { ethers } from "ethers";
import { Pool } from "../..";
import { limitBuyManagerAddress, networkChainIdMap } from "../../config";
import { LimitBuyOrder, SignedLimitBuyOrder } from "../../types";

const DHEDGE_API_URL = "https://api-v2.dhedge.org/graphql";

export const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

export const EIP712_TYPES = {
  PermitWitnessTransferFrom: [
    { name: "permitted", type: "TokenPermissions" },
    { name: "spender", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "witness", type: "LimitBuyOrder" }
  ],
  TokenPermissions: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" }
  ],
  LimitBuyOrder: [
    { name: "owner", type: "address" },
    { name: "targetVault", type: "address" },
    { name: "pricingAsset", type: "address" },
    { name: "minTriggerPriceD18", type: "uint256" },
    { name: "maxTriggerPriceD18", type: "uint256" },
    { name: "slippageToleranceBps", type: "uint16" }
  ]
};

export function generatePermit2Nonce(): ethers.BigNumber {
  // Random value fitting in uint48
  return ethers.BigNumber.from(Math.floor(Math.random() * 2 ** 48));
}

export function daysFromNowToTimestamp(days: number): number {
  return Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
}

export async function submitLimitBuyOrder(
  signedOrder: SignedLimitBuyOrder
): Promise<any> {
  const mutation = `
    mutation CreateLimitBuyOrder($input: CreateLimitBuyOrderInput!) {
      createLimitBuyOrder(input: $input) {
        id
        success
      }
    }
  `;

  const input = {
    targetVault: signedOrder.order.targetVault,
    pricingAsset: signedOrder.order.pricingAsset,
    minTriggerPriceD18: signedOrder.order.minTriggerPriceD18,
    maxTriggerPriceD18: signedOrder.order.maxTriggerPriceD18,
    slippageToleranceBps: signedOrder.order.slippageToleranceBps,
    inputToken: signedOrder.permit.token,
    inputAmount: signedOrder.permit.amount,
    nonce: signedOrder.permit.nonce,
    deadline: Number(signedOrder.permit.deadline),
    owner: signedOrder.owner,
    signature: signedOrder.signature,
    chainId: signedOrder.chainId
  };

  const { data } = await axios.post(DHEDGE_API_URL, {
    query: mutation,
    variables: { input }
  });

  if (data.errors?.length) {
    throw new Error(data.errors[0].message);
  }

  return data.data.createLimitBuyOrder;
}

export async function createTorosLimitBuyOrder(
  pool: Pool,
  vaultAddress: string,
  inputToken: string,
  inputAmount: ethers.BigNumber | string,
  pricingAsset: string,
  minTriggerPriceD18: ethers.BigNumber | string | null | undefined,
  maxTriggerPriceD18: ethers.BigNumber | string | null | undefined,
  slippageToleranceBps: number,
  deadlineDays: number
): Promise<any> {
  const managerAddress = limitBuyManagerAddress[pool.network];
  if (!managerAddress) {
    throw new Error(`Limit buy orders not supported on ${pool.network}`);
  }

  const chainId = networkChainIdMap[pool.network];

  const resolvedMin =
    minTriggerPriceD18 == null
      ? ethers.BigNumber.from(0)
      : ethers.BigNumber.from(minTriggerPriceD18);

  const resolvedMax =
    maxTriggerPriceD18 == null
      ? ethers.constants.MaxUint256
      : ethers.BigNumber.from(maxTriggerPriceD18);

  const amount = ethers.BigNumber.from(inputAmount);
  const nonce = generatePermit2Nonce();
  const deadline = daysFromNowToTimestamp(deadlineDays);

  const order: LimitBuyOrder = {
    owner: pool.address,
    targetVault: vaultAddress,
    pricingAsset,
    minTriggerPriceD18: resolvedMin,
    maxTriggerPriceD18: resolvedMax,
    slippageToleranceBps
  };

  const permitMessage = {
    permitted: { token: inputToken, amount },
    spender: managerAddress,
    nonce,
    deadline: ethers.BigNumber.from(deadline),
    witness: order
  };

  const domain = {
    name: "Permit2",
    chainId,
    verifyingContract: PERMIT2_ADDRESS
  };

  const signature = await pool.signer._signTypedData(
    domain,
    EIP712_TYPES,
    permitMessage
  );

  const signedOrder: SignedLimitBuyOrder = {
    order: {
      owner: order.owner,
      targetVault: order.targetVault,
      pricingAsset: order.pricingAsset,
      minTriggerPriceD18: resolvedMin.toString(),
      maxTriggerPriceD18: resolvedMax.toString(),
      slippageToleranceBps: order.slippageToleranceBps
    },
    permit: {
      token: inputToken,
      amount: amount.toString(),
      nonce: nonce.toString(),
      deadline
    },
    owner: pool.address,
    signature,
    chainId
  };

  return submitLimitBuyOrder(signedOrder);
}
