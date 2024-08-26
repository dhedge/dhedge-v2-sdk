//Polygon
// export const USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
// export const WETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
// export const USDT = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
// export const DAI = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
// export const TUSD = "0x2e1ad108ff1d8c782fcbbb89aad783ac49586756";
// export const WBTC = "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6";
// export const SUSHI = "0x0b3f868e0be5597d5db7feb59e1cadbb0fdda50a";
// export const WMATIC = "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270";
// export const BAL = "0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3";
// export const AMUSDC = "0x1a13f4ca1d028320a707d99520abfefca3998b7f";
// export const VDEBTWETH = "0xede17e9d79fc6f9ff9250d9eefbdb88cc18038b5";
// export const ARRAKIS_USDC_WETH_GAUGE =
//   "0x33d1ad9Cd88A509397CD924C2d7613C285602C20";
// export const STMATIC = "0x3A58a54C066FdC0f2D55FC9C89F0415C92eBf3C4";
// export const WMATIC_STMATIC_LP = "0xaF5E0B5425dE1F5a630A8cB5AA9D97B8141C908D";
// export const AARAKIS_WNATIC_STMATIC_GAUGE =
//   "0x9928340f9E1aaAd7dF1D95E27bd9A5c715202a56";
// export const ETHBULL3X = "0x460b60565cb73845d56564384ab84bf84c13e47d";
// export const BTCBEAR2X = "0x3dbce2c8303609c17aa23b69ebe83c2f5c510ada";

import { ethers } from "ethers";
import { Network } from "../types";

//Optimism
export const WETH = "0x4200000000000000000000000000000000000006";
export const USDC = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607";
export const DAI = "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1";
export const USDy = "0x1ec50880101022c11530a069690f5446d1464592";
export const WBTC = "0x68f180fcCe6836688e9084f035309E29Bf0A2095";
export const OP = "0x4200000000000000000000000000000000000042";
export const WSTETH = "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb";
export const VEL = "0x3c8B650257cFb5f272f799F5e2b4e65093a11a05";
export const SUSD = "0x8c6f28f2f1a3c87f0f938b96d27520d9751ec8d9";
export const SETH = "0xE405de8F52ba7559f9df3C368500B6E6ae6Cee49";
export const ARRAKIS_USDC_WETH_GAUGE =
  "0xb8888ea29e2f70ad62a3b69b1a1342720612a00d";
export const KWENTA_ETH_PERP = "0xf86048dff23cf130107dfb4e6386f574231a5c65";
export const KWENTA_ETH_PERP_V2 = "0x2b3bb4c683bfc5239b029131eef3b1d214478d93";

export const TEST_POOL = {
  [Network.POLYGON]: "0x699fd4d6eadb216704c7e355cfa0a12f51813163",
  [Network.OPTIMISM]: "0x12573bfdf764ab9d52aca20e2827497a66829716",
  [Network.ARBITRUM]: "0x2dc2f936c8b6619facc69355d65dd93d2f4cc2bd",
  [Network.BASE]: "0x4842b42F68524383F609aa46eAfc18c1459cE3cD"
};

export const CONTRACT_ADDRESS = {
  [Network.POLYGON]: {
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    SWETH: "",
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    WBTC: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
    ARRAKIS_USDC_WETH_GAUGE: "0x33d1ad9Cd88A509397CD924C2d7613C285602C20",
    ARRAKIS_USDC_WETH_LP: "0xa173340f1e942c2845bcbce8ebd411022e18eb13",
    WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    uniswapV3: {
      nonfungiblePositionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"
    },
    VELODROME_CL_USDC_WETH_GAUGE: "",
    VELO: "",
    COMPOUNDV3_USDC: ""
  },

  [Network.OPTIMISM]: {
    USDC: "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
    SUSD: "0x8c6f28f2f1a3c87f0f938b96d27520d9751ec8d9",
    SWETH: "",
    WETH: "0x4200000000000000000000000000000000000006",
    WBTC: "0x68f180fcCe6836688e9084f035309E29Bf0A2095",
    KWENTA_ETH_PERP_V2: "0x2b3bb4c683bfc5239b029131eef3b1d214478d93",
    uniswapV3: {
      nonfungiblePositionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"
    },

    WMATIC: "",
    //
    ARRAKIS_USDC_WETH_GAUGE: "",
    ARRAKIS_USDC_WETH_LP: "",
    VELODROME_CL_USDC_WETH_GAUGE: "0xa75127121d28a9BF848F3B70e7Eea26570aa7700",
    VELO: "0x9560e827aF36c94D2Ac33a39bCE1Fe78631088Db",
    COMPOUNDV3_USDC: ""
  },
  [Network.ARBITRUM]: {
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    SWETH: "0xbc011A12Da28e8F0f528d9eE5E7039E22F91cf18",
    WETH: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
    WBTC: "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
    WSTETH: "0x5979d7b546e38e414f7e9822514be443a4800529",
    BALANCER_WSTETH_WETH_POOL: "0x36bf227d6bac96e2ab1ebb5492ecec69c691943f",
    BALANCER_WSTETH_WETH_GAUGE: "0x251e51b25afa40f2b6b9f05aaf1bc7eaa0551771",

    uniswapV3: {
      nonfungiblePositionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"
    },

    //
    ARRAKIS_USDC_WETH_GAUGE: "",
    ARRAKIS_USDC_WETH_LP: "",
    WMATIC: "",
    VELODROME_CL_USDC_WETH_GAUGE: "",
    VELO: "",
    COMPOUNDV3_USDC: "0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf"
  },
  [Network.BASE]: {
    USDC: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    WETH: "0x4200000000000000000000000000000000000006",
    WBTC: "",
    SWETH: "",
    uniswapV3: {
      nonfungiblePositionManager: ""
    },
    //
    ARRAKIS_USDC_WETH_GAUGE: "",
    ARRAKIS_USDC_WETH_LP: "",
    WMATIC: "",
    VELODROME_CL_USDC_WETH_GAUGE: "",
    VELO: "",
    COMPOUNDV3_USDC: ""
  }
};

export const MAX_AMOUNT = ethers.constants.MaxUint256;

export const USDC_BALANCEOF_SLOT = {
  [Network.OPTIMISM]: 9,
  [Network.ARBITRUM]: 9,
  [Network.POLYGON]: 0,
  [Network.BASE]: 9
};

export const WETH_BALANCEOF_SLOT = {
  [Network.OPTIMISM]: 3,
  [Network.ARBITRUM]: 51,
  [Network.POLYGON]: 0,
  [Network.BASE]: 0
};
