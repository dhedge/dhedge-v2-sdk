import {
  Dapp,
  AddressNetworkMap,
  Network,
  AddressDappNetworkMap,
  LyraNetworkMap
} from "./types";
import { NetworkChainIdMap } from ".";
import { Deployment } from "@lyrafinance/lyra-js";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

export const factoryAddress: AddressNetworkMap = {
  [Network.POLYGON]: process.env.STAGING_CONTRACTS
    ? "0xDd87eCdB10cFF7004276AAbAbd30e7a08F69bb53"
    : "0xfdc7b8bFe0DD3513Cc669bB8d601Cb83e2F69cB0",
  [Network.OPTIMISM]: "0x5e61a079A178f0E5784107a4963baAe0c5a680c6",
  [Network.ARBITRUM]: "0xfffb5fb14606eb3a548c113026355020ddf27535",
  [Network.BASE]: "0x49Afe3abCf66CF09Fab86cb1139D8811C8afe56F"
};

export const routerAddress: AddressDappNetworkMap = {
  [Network.POLYGON]: {
    [Dapp.SUSHISWAP]: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    [Dapp.AAVE]: "0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf",
    [Dapp.AAVEV3]: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    [Dapp.ONEINCH]: "0x111111125421ca6dc452d289314280a0f8842a65",
    [Dapp.QUICKSWAP]: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
    [Dapp.BALANCER]: "0xBA12222222228d8Ba445958a75a0704d566BF2C8",
    [Dapp.UNISWAPV3]: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    [Dapp.ARRAKIS]: "0xc73fb100a995b33f9fa181d420f4c8d74506df66",
    [Dapp.TOROS]: "0xB2F1498983bf9c9442c35F772e6C1AdE66a8DeDE",
    [Dapp.ZEROEX]: "0xdef1c0ded9bec7f1a1670819833240f027b25eff"
  },
  [Network.OPTIMISM]: {
    [Dapp.UNISWAPV3]: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    [Dapp.SYNTHETIX]: "0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4",
    [Dapp.AAVEV3]: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    [Dapp.ONEINCH]: "0x111111125421ca6dc452d289314280a0f8842a65",
    [Dapp.TOROS]: "0x3988513793bCE39f0167064A9F7fC3617FaF35AB",
    [Dapp.VELODROME]: "0x9c12939390052919aF3155f41Bf4160Fd3666A6f",
    [Dapp.VELODROMEV2]: "0xa062ae8a9c5e11aaa026fc2670b0d65ccc8b2858",
    [Dapp.LYRA]: "0xCCE7819d65f348c64B7Beb205BA367b3fE33763B",
    [Dapp.ARRAKIS]: "0x9ce88a56d120300061593eF7AD074A1B710094d5",
    [Dapp.ZEROEX]: "0xdef1abe32c034e558cdd535791643c58a13acc10"
  },
  [Network.ARBITRUM]: {
    [Dapp.ONEINCH]: "0x111111125421ca6dc452d289314280a0f8842a65",
    [Dapp.UNISWAPV3]: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    [Dapp.AAVEV3]: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    [Dapp.BALANCER]: "0xBA12222222228d8Ba445958a75a0704d566BF2C8",
    [Dapp.RAMSES]: "0xaaa87963efeb6f7e0a2711f397663105acb1805e",
    [Dapp.ZEROEX]: "0xdef1c0ded9bec7f1a1670819833240f027b25eff"
  },
  [Network.BASE]: {
    [Dapp.ONEINCH]: "0x111111125421ca6dc452d289314280a0f8842a65",
    [Dapp.ZEROEX]: "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
    [Dapp.AERODROME]: "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43",
    [Dapp.AAVEV3]: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5"
  }
};

export const dappFactoryAddress: AddressDappNetworkMap = {
  [Network.POLYGON]: {
    [Dapp.SUSHISWAP]: "0xc35DADB65012eC5796536bD9864eD8773aBc74C4",
    [Dapp.QUICKSWAP]: "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32"
  },
  [Network.OPTIMISM]: {},
  [Network.ARBITRUM]: {},
  [Network.BASE]: {}
};

export const stakingAddress: AddressDappNetworkMap = {
  [Network.POLYGON]: {
    [Dapp.SUSHISWAP]: "0x0769fd68dFb93167989C6f7254cd0D766Fb2841F",
    [Dapp.BALANCER]: "0x0F3e0c4218b7b0108a3643cFe9D3ec0d4F57c54e",
    [Dapp.AAVE]: "0x357D51124f59836DeD84c8a1730D72B749d8BC23",
    [Dapp.AAVEV3]: "0x929EC64c34a17401F460460D4B9390518E5B473e"
  },
  [Network.OPTIMISM]: {
    [Dapp.AAVEV3]: "0x929EC64c34a17401F460460D4B9390518E5B473e"
  },
  [Network.ARBITRUM]: {},
  [Network.BASE]: {}
};

export const aaveAddressProvider: AddressDappNetworkMap = {
  [Network.POLYGON]: {
    [Dapp.AAVE]: "0xd05e3E715d945B59290df0ae8eF85c1BdB684744",
    [Dapp.AAVEV3]: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb"
  },
  [Network.OPTIMISM]: {
    [Dapp.AAVEV3]: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb"
  },
  [Network.ARBITRUM]: {
    [Dapp.AAVEV3]: "0xa97684ead0e402dc232d5a977953df7ecbab3cdb"
  },
  [Network.BASE]: {
    // https://docs.aave.com/developers/deployed-contracts/v3-mainnet/base
    [Dapp.AAVEV3]: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D"
  }
};
export const nonfungiblePositionManagerAddress: AddressDappNetworkMap = {
  [Network.POLYGON]: {
    [Dapp.UNISWAPV3]: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"
  },
  [Network.OPTIMISM]: {
    [Dapp.UNISWAPV3]: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    [Dapp.VELODROMECL]: "0x416b433906b1B72FA758e166e239c43d68dC6F29"
  },
  [Network.ARBITRUM]: {
    [Dapp.UNISWAPV3]: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    [Dapp.RAMSESCL]: "0xAA277CB7914b7e5514946Da92cb9De332Ce610EF"
  },
  [Network.BASE]: {
    [Dapp.UNISWAPV3]: "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1",
    [Dapp.AERODROMECL]: "0x827922686190790b37229fd06084350e74485b72"
  }
};

export const networkChainIdMap: NetworkChainIdMap = {
  [Network.POLYGON]: 137,
  [Network.OPTIMISM]: 10,
  [Network.ARBITRUM]: 42161,
  [Network.BASE]: 8453
};

export const balancerSubgraph: AddressNetworkMap = {
  [Network.POLYGON]:
    "https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2",
  [Network.OPTIMISM]: "",
  [Network.ARBITRUM]: "",
  [Network.BASE]: ""
};

export const multiCallAddress: AddressNetworkMap = {
  [Network.POLYGON]: "0x275617327c958bD06b5D6b871E7f491D76113dd8",
  [Network.OPTIMISM]: "",
  [Network.ARBITRUM]: "",
  [Network.BASE]: ""
};

export const lyraNetworkMap: LyraNetworkMap = {
  [Network.OPTIMISM]: Deployment.Mainnet
};

export const MaxUint128 = "0xffffffffffffffffffffffffffffffff";
export const UNISWAPV3_QUOTER_ADDRESS =
  "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";

export const SYNTHETIX_TRACKING_CODE =
  "0x4448454447450000000000000000000000000000000000000000000000000000";

export const flatMoneyContractAddresses: Readonly<Partial<
  Record<
    Network,
    {
      DelayedOrder: string;
      FlatcoinVault: string;
      StableModule: string;
      RETH: string;
    }
  >
>> = {
  [Network.BASE]: {
    DelayedOrder: "0x6D857e9D24a7566bB72a3FB0847A3E0e4E1c2879",
    FlatcoinVault: "0x95Fa1ddc9a78273f795e67AbE8f1Cd2Cd39831fF",
    StableModule: "0xb95fB324b8A2fAF8ec4f76e3dF46C718402736e2",
    RETH: "0xb6fe221fe9eef5aba221c348ba20a1bf5e73624c"
  }
};
