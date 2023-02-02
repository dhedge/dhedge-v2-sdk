import { ethers } from "ethers";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

// const provider = new ethers.providers.JsonRpcProvider(
//   `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_PROJECT_ID}`
// );

// const provider = new ethers.providers.JsonRpcProvider(
//   `https://opt-kovan.g.alchemy.com/v2/${process.env.ALCHEMY_PROJECT_ID}`
// );

// const provider = new ethers.providers.JsonRpcProvider(
//   `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
// );

// const provider = new ethers.providers.JsonRpcProvider(
//   `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
// );

const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545/");

export const wallet = new ethers.Wallet(
  process.env.PRIVATE_KEY as string,
  provider
);
