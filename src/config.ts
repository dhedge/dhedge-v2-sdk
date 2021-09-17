import {
  Dapp,
  AddressNetworkMap,
  Network,
  AddressDappNetworkMap
} from "./types";

export const factoryAddress: AddressNetworkMap = {
  [Network.POLYGON]: "0xDd87eCdB10cFF7004276AAbAbd30e7a08F69bb53"
};

export const routerAddress: AddressDappNetworkMap = {
  [Network.POLYGON]: {
    [Dapp.SUSHISWAP]: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    [Dapp.AAVE]: "0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf",
    [Dapp.ONEINCH]: "0x11111112542D85B3EF69AE05771c2dCCff4fAa26"
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
