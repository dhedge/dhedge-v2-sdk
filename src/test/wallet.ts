import { ethers } from "ethers";
import { Network } from "../types";
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

// const provider = new ethers.providers.JsonRpcProvider(
//   `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_PROJECT_ID}`
// );

// const provider = new ethers.providers.JsonRpcProvider(
//   `https://opt-kovan.g.alchemy.com/v2/${process.env.ALCHEMY_PROJECT_ID}`
// );

// const provider = new ethers.providers.JsonRpcProvider(
//   `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_PROJECT_ID}`
// );

// const provider = new ethers.providers.JsonRpcProvider(
//   `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
// );

const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545/");

export const wallet = new ethers.Wallet(
  process.env.PRIVATE_KEY as string,
  provider
);

export const networkPortMap = {
  [Network.POLYGON]: 8542,
  [Network.OPTIMISM]: 8544,
  [Network.ARBITRUM]: 8540
};

export const getWalletData = (
  network: Network
): {
  wallet: ethers.Wallet;
  provider: ethers.providers.JsonRpcProvider;
} => {
  const provider = new ethers.providers.JsonRpcProvider(
    `http://127.0.0.1:${networkPortMap[network]}/`
  );
  return {
    wallet: new ethers.Wallet(process.env.PRIVATE_KEY as string, provider),
    provider
  };
};
