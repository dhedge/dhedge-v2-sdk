import {
  Dapp,
  AddressNetworkMap,
  Network,
  AddressDappNetworkMap
} from "./types";
import { ChainId } from "@sushiswap/sdk";
import { NetworkChainIdMap } from ".";

export const factoryAddress: AddressNetworkMap = {
  [Network.POLYGON]: "0xDd87eCdB10cFF7004276AAbAbd30e7a08F69bb53"
};

export const routerAddress: AddressDappNetworkMap = {
  [Network.POLYGON]: {
    [Dapp.SUSHISWAP]: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    [Dapp.AAVE]: "0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf",
    [Dapp.ONEINCH]: "0x11111112542D85B3EF69AE05771c2dCCff4fAa26",
    [Dapp.QUICKSWAP]: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"
  }
};

export const dappFactoryAddress: AddressDappNetworkMap = {
  [Network.POLYGON]: {
    [Dapp.SUSHISWAP]: "0xc35DADB65012eC5796536bD9864eD8773aBc74C4",
    [Dapp.QUICKSWAP]: "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32"
  }
};

export const stakingAddress: AddressDappNetworkMap = {
  [Network.POLYGON]: {
    [Dapp.SUSHISWAP]: "0x0769fd68dFb93167989C6f7254cd0D766Fb2841F"
  }
};

export const networkChainIdMap: NetworkChainIdMap = {
  [Network.POLYGON]: ChainId.MATIC
};
