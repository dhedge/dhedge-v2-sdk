import { BigNumber } from "ethers";

export enum Network {
  POLYGON = "polygon",
  OPTIMISM = "optimism"
}

export enum Dapp {
  SUSHISWAP = "sushiswap",
  AAVE = "aave",
  ONEINCH = "1inch",
  QUICKSWAP = "quickswap",
  BALANCER = "balancer",
  UNISWAPV3 = "uniswapV3",
  SYNTHETIX = "synthetix",
  AAVEV3 = "aavev3",
  ARRAKIS = "arrakis"
}

export enum Transaction {
  SWAP = "swapExactTokensForTokens",
  ADD_LIQUIDITY = "addLiquidity",
  DEPOSIT = "deposit",
  HARVEST = "harvest",
  CLAIM_DISTRIBIUTIONS = "claimDistributions",
  CLAIM_REWARDS = "claimRewards",
  REMOVE_LIQUIDITY = "removeLiquidity",
  DECREASE_LIQUIDITY = "decreaseLiquidity",
  INCREASE_LIQUIDITY = "increaseLiquidity",
  COLLECT = "collect",
  MULTI_CALL = "multicall",
  BORROW = "borrow",
  REPAY = "repay",
  WITHDRAW = "withdraw",
  MINT = "mint",
  BURN = "burn",
  SWAP_SYNTHS = "exchangeWithTracking",
  ADD_LIQUIDITY_STAKE = "addLiquidityAndStake",
  REMOVE_LIQUIDITY_UNSTAKE = "removeLiquidityAndUnstake"
}

export type AddressNetworkMap = Readonly<Record<Network, string>>;

export type AddressDappMap = {
  [key in Dapp]?: string;
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

export type NetworkChainIdMap = Readonly<Record<Network, number>>;
