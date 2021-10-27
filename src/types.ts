import { ChainId } from "@sushiswap/sdk";
import { BigNumber } from "ethers";

export enum Network {
  POLYGON = "polygon"
}

export enum Dapp {
  SUSHISWAP = "sushiswap",
  AAVE = "aave",
  ONEINCH = "1inch",
  QUICKSWAP = "quickswap",
  BALANCER = "balancer"
}

export enum Transaction {
  SWAP = "swapExactTokensForTokens",
  ADD_LIQUIDITY = "addLiquidity",
  DEPOSIT = "deposit",
  HARVEST = "harvest",
  UNSTAKE = "withdrawAndHarvest",
  REMOVE_LIQUIDITY = "removeLiquidity",
  BORROW = "borrow",
  REPAY = "repay",
  WITHDRAW = "withdraw"
}

export type AddressNetworkMap = Readonly<Record<Network, string>>;

export type AddressDappMap = {
  [Dapp.SUSHISWAP]?: string;
  [Dapp.AAVE]?: string;
  [Dapp.ONEINCH]?: string;
  [Dapp.QUICKSWAP]?: string;
  [Dapp.BALANCER]?: string;
};

export type AddressDappNetworkMap = Readonly<Record<Network, AddressDappMap>>;

export type SupportedAsset = [string, boolean];

export type AssetEnabled = {
  asset: string;
  isDeposit: boolean;
};

export type FundComposition = {
  asset: string;
  isDeposit: boolean;
  balance: BigNumber;
  rate: BigNumber;
};

export type Reserves = {
  assetA: BigNumber;
  assetB: BigNumber;
};

export type NetworkChainIdMap = Readonly<Record<Network, ChainId>>;
