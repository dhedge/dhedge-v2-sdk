import {
  Dapp,
  AddressNetworkMap,
  Network,
  AddressDappNetworkMap
} from "./types";
import { NetworkChainIdMap } from ".";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

export const factoryAddress: AddressNetworkMap = {
  [Network.POLYGON]: process.env.STAGING_CONTRACTS
    ? "0xDd87eCdB10cFF7004276AAbAbd30e7a08F69bb53"
    : "0xfdc7b8bFe0DD3513Cc669bB8d601Cb83e2F69cB0",
  [Network.OPTIMISM]: "0x5e61a079A178f0E5784107a4963baAe0c5a680c6"
};

export const routerAddress: AddressDappNetworkMap = {
  [Network.POLYGON]: {
    [Dapp.SUSHISWAP]: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    [Dapp.AAVE]: "0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf",
    [Dapp.AAVEV3]: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    [Dapp.ONEINCH]: "0x1111111254fb6c44bac0bed2854e76f90643097d",
    [Dapp.QUICKSWAP]: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
    [Dapp.BALANCER]: "0xBA12222222228d8Ba445958a75a0704d566BF2C8",
    [Dapp.UNISWAPV3]: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    [Dapp.ARRAKIS]: "0xbc91a120cCD8F80b819EAF32F0996daC3Fa76a6C",
    [Dapp.TOROS]: "0x9e080df81d9Db50348ef40F630fAE74f5Aea1f68"
  },
  [Network.OPTIMISM]: {
    [Dapp.UNISWAPV3]: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    [Dapp.SYNTHETIX]: "0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4",
    [Dapp.AAVEV3]: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    [Dapp.ONEINCH]: "0x1111111254760F7ab3F16433eea9304126DCd199",
    [Dapp.TOROS]: "0x15B7199AA9b9CaE9e611d858ab458aea8D36555B"
  }
};

export const dappFactoryAddress: AddressDappNetworkMap = {
  [Network.POLYGON]: {
    [Dapp.SUSHISWAP]: "0xc35DADB65012eC5796536bD9864eD8773aBc74C4",
    [Dapp.QUICKSWAP]: "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32"
  },
  [Network.OPTIMISM]: {}
};

export const stakingAddress: AddressDappNetworkMap = {
  [Network.POLYGON]: {
    [Dapp.SUSHISWAP]: "0x0769fd68dFb93167989C6f7254cd0D766Fb2841F",
    [Dapp.BALANCER]: "0x0F3e0c4218b7b0108a3643cFe9D3ec0d4F57c54e",
    [Dapp.AAVE]: "0x357D51124f59836DeD84c8a1730D72B749d8BC23"
  },
  [Network.OPTIMISM]: {}
};

export const nonfungiblePositionManagerAddress: AddressNetworkMap = {
  [Network.POLYGON]: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  [Network.OPTIMISM]: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"
};

export const networkChainIdMap: NetworkChainIdMap = {
  [Network.POLYGON]: 137,
  [Network.OPTIMISM]: 10
};

export const balancerSubgraph: AddressNetworkMap = {
  [Network.POLYGON]:
    "https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2",
  [Network.OPTIMISM]: ""
};

export const multiCallAddress: AddressNetworkMap = {
  [Network.POLYGON]: "0x275617327c958bD06b5D6b871E7f491D76113dd8",
  [Network.OPTIMISM]: ""
};

export const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
export const MaxUint128 = "0xffffffffffffffffffffffffffffffff";
export const UNISWAPV3_QUOTER_ADDRESS =
  "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";

export const SYNTHETIX_TRACKING_CODE =
  "0x4448454447450000000000000000000000000000000000000000000000000000";
