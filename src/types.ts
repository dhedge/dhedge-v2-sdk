import { Deployment } from "@lyrafinance/lyra-js";
import { BigNumber } from "ethers";

export enum Network {
  POLYGON = "polygon",
  OPTIMISM = "optimism",
  ARBITRUM = "arbitrum",
  BASE = "base",
  ETHEREUM = "ethereum"
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
  ARRAKIS = "arrakis",
  TOROS = "toros",
  VELODROME = "velodrome",
  VELODROMEV2 = "velodromeV2",
  VELODROMECL = "velodromeCL",
  LYRA = "lyra",
  RAMSES = "ramses",
  AERODROME = "aerodrome",
  AERODROMECL = "aerodromeCL",
  RAMSESCL = "ramsesCL",
  PANCAKECL = "pancakeCL",
  COMPOUNDV3 = "compoundV3",
  ODOS = "odos",
  PENDLE = "pendle",
  KYBERSWAP = "kyberswap"
  DYTM = "dytm"
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

export type LyraOptionMarket = "eth";
export type AddressMarketMap = {
  [key in LyraOptionMarket]: string;
};

export type LyraTradeType = "buy" | "sell";
export type LyraOptionType = "call" | "put";
export type LyraNetworkMap = { [key in Network]?: Deployment };
export type LyraPosition = {
  positionId: BigNumber;
  strikeId: BigNumber;
  optionType: number;
  amount: BigNumber;
  collateral: BigNumber;
  state: number;
};

export type SDKOptions =
  | {
      estimateGas: boolean;
      onlyGetTxData?: boolean;
      useTraderAddressAsFrom?: boolean;
    }
  | boolean; // shorthand for { estimateGas: true/false }; for backward compatibility
