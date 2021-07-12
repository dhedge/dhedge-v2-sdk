import dotenv from "dotenv";

import {
  Dapp,
  FactoryNetworkMap,
  Network,
  NetworkRouterMap,
  WalletConfig
} from "./types";

const envFound = dotenv.config();

if (!envFound) {
  throw new Error("Couldn't find .env file.");
}

export const factoryAddress: FactoryNetworkMap = {
  [Network.MUMBAI]: "0x03D20ef9bdc19736F5e8Baf92D02C8661a5941F7",
  [Network.POLYGON]: ""
};

export const walletConfig: WalletConfig = {
  privateKey: process.env.PRIVATE_KEY || "",
  mnemonic: process.env.MNEMONIC || "",
  accountId: process.env.ACCOUNT_ID || "0",
  provider: process.env.PROVIDER || "http://localhost:8545",
  network: (process.env.NETWORK as Network) || Network.MUMBAI
};

export const routerAddress: NetworkRouterMap = {
  [Network.MUMBAI]: {
    [Dapp.SUSHISWAP]: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
  },
  [Network.POLYGON]: {
    [Dapp.SUSHISWAP]: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
  }
};
