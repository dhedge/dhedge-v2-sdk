import {
  Dapp,
  AddressNetworkMap,
  Network,
  AddressDappNetworkMap
} from "./types";

export const factoryAddress: AddressNetworkMap = {
  [Network.POLYGON]: "0xfdc7b8bFe0DD3513Cc669bB8d601Cb83e2F69cB0"
};

export const routerAddress: AddressDappNetworkMap = {
  [Network.POLYGON]: {
    [Dapp.SUSHISWAP]: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
  }
};

export const dappFactoryAddress: AddressDappNetworkMap = {
  [Network.POLYGON]: {
    [Dapp.SUSHISWAP]: "0xc35DADB65012eC5796536bD9864eD8773aBc74C4"
  }
};

export const stakingAddress: AddressDappNetworkMap = {
  [Network.POLYGON]: {
    [Dapp.SUSHISWAP]: "0x0769fd68dFb93167989C6f7254cd0D766Fb2841F"
  }
};
