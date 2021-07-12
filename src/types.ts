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

export type FactoryNetworkMap = Readonly<Record<Network, string>>;

export type RouterDappMap = {
  [Dapp.SUSHISWAP]?: string;
  [Dapp.UNISWAP]?: string;
  [Dapp.AAVE]?: string;
};

export type NetworkRouterMap = Readonly<Record<Network, RouterDappMap>>;
