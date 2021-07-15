import { BigNumber } from "ethers";

export enum Network {
  POLYGON = "polygon",
  MUMBAI = "mumbai"
}

export enum Dapp {
  SUSHISWAP = "sushiswap",
  UNISWAP = "uniswap",
  AAVE = "aave"
}

export enum Transaction {
  SWAP = "swapExactTokensForTokens"
}

export type WalletConfig = {
  privateKey: string;
  mnemonic: string;
  accountId: string;
  provider: string;
  network: Network;
};

export type AddressNetworkMap = Readonly<Record<Network, string>>;

export type AddressDappMap = {
  [Dapp.SUSHISWAP]?: string;
  [Dapp.UNISWAP]?: string;
  [Dapp.AAVE]?: string;
};

export type AddressDappNetworkMap = Readonly<Record<Network, AddressDappMap>>;

export type SupportedAsset = [ string, boolean ]

export type AssetEnabled = {
  asset: string;
  isDeposit: boolean;
}

export type FundComposition = {
  asset: string;
  isDeposit: boolean;
  balance: BigNumber;
  rate: BigNumber;
}