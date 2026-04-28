import { Deployment } from "@lyrafinance/lyra-js";
import { BigNumber } from "ethers";

/** Networks supported by the SDK. The string value matches keys in `routerAddress`,
 * `nonfungiblePositionManagerAddress`, etc. in `config.ts`. */
export enum Network {
  POLYGON = "polygon",
  OPTIMISM = "optimism",
  ARBITRUM = "arbitrum",
  BASE = "base",
  ETHEREUM = "ethereum",
  PLASMA = "plasma",
  HYPERLIQUID = "hyperliquid"
}

/** Identifies a target protocol/integration for `pool.trade`, `pool.approve`, etc.
 * Each entry maps to address registries (router, factory, gauge) in `config.ts`. */
export enum Dapp {
  SUSHISWAP = "sushiswap",
  AAVE = "aave",
  ONEINCH = "1inch",
  QUICKSWAP = "quickswap",
  BALANCER = "balancer",
  UNISWAPV3 = "uniswapV3",
  AAVEV3 = "aavev3",
  ARRAKIS = "arrakis",
  TOROS = "toros",
  VELODROME = "velodrome",
  VELODROMEV2 = "velodromeV2",
  VELODROMECL = "velodromeCL",
  LYRA = "lyra",
  AERODROME = "aerodrome",
  AERODROMECL = "aerodromeCL",
  PANCAKECL = "pancakeCL",
  COMPOUNDV3 = "compoundV3",
  ODOS = "odos",
  PENDLE = "pendle",
  KYBERSWAP = "kyberswap",
  HYPERLIQUID = "hyperliquid",
  COWSWAP = "cowswap"
}

/** Function-name strings used when encoding ABI calls — keep in sync with the
 * matching ABI files in `src/abi/`. */
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
  ADD_LIQUIDITY_STAKE = "addLiquidityAndStake",
  REMOVE_LIQUIDITY_UNSTAKE = "removeLiquidityAndUnstake"
}

export type AddressNetworkMap = Readonly<Record<Network, string>>;

export type AddressDappMap = {
  [key in Dapp]?: string;
};

export type AddressDappNetworkMap = Readonly<Record<Network, AddressDappMap>>;

/** Tuple form `[asset, isDeposit]` accepted by the factory's `createFund`. */
export type SupportedAsset = [string, boolean];

/** Object form of a supported asset entry; preferred over `SupportedAsset` in SDK methods. */
export type AssetEnabled = {
  asset: string;
  isDeposit: boolean;
};

/** A pool's holding of one asset returned by `pool.getComposition()`. */
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

/**
 * Options that control how SDK methods dispatch a transaction:
 *  - `estimateGas`: simulate and return gas + minAmountOut without sending.
 *  - `onlyGetTxData`: return the encoded calldata without sending or simulating.
 *  - `useTraderAddressAsFrom`: send via the EOA wallet instead of the pool's
 *    `execTransaction` (used when the SDK is acting as a non-dHEDGE caller).
 *  - `boolean` shorthand: `true` is equivalent to `{ estimateGas: true }` (kept
 *    for backward compatibility).
 */
export type SDKOptions =
  | {
      estimateGas: boolean;
      onlyGetTxData?: boolean;
      useTraderAddressAsFrom?: boolean;
    }
  | boolean;

/** Parameters for a Toros limit order (stop-loss / take-profit) on a vault token. */
export type LimitOrderInfo = {
  amount: BigNumber;
  stopLossPriceD18: BigNumber;
  takeProfitPriceD18: BigNumber;
  user: string;
  pool: string;
  pricingAsset: string;
};
