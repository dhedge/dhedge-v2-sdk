import dotenv from "dotenv";

import {
  Dapp,
  AddressNetworkMap,
  Network,
  AddressDappNetworkMap
} from "./types";

const envFound = dotenv.config();

if (!envFound) {
  throw new Error("Couldn't find .env file.");
}

export const factoryAddress: AddressNetworkMap = {
  [Network.MUMBAI]: "0xeec15f2716c7a98fFe14F7aD0dEeC93962aF4437",
  [Network.POLYGON]: "0x72b8CCE4bE8EfDC50e493cB210f9b9Eb15033453"
};

export const routerAddress: AddressDappNetworkMap = {
  [Network.MUMBAI]: {
    [Dapp.SUSHISWAP]: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
  },
  [Network.POLYGON]: {
    [Dapp.SUSHISWAP]: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
  }
};

export const dappFactoryAddress: AddressDappNetworkMap = {
  [Network.MUMBAI]: {
    [Dapp.SUSHISWAP]: "0xc35DADB65012eC5796536bD9864eD8773aBc74C4"
  },
  [Network.POLYGON]: {
    [Dapp.SUSHISWAP]: "0xc35DADB65012eC5796536bD9864eD8773aBc74C4"
  }
};

export const stakingAddress: AddressDappNetworkMap = {
  [Network.POLYGON]: {
    [Dapp.SUSHISWAP]: "0x0769fd68dFb93167989C6f7254cd0D766Fb2841F"
  },
  [Network.MUMBAI]: {
    [Dapp.SUSHISWAP]: ""
  }
};
