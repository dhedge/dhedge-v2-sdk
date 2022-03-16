import { ethers } from "ethers";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

const provider = new ethers.providers.JsonRpcProvider(
  `https://opt-mainnet.g.alchemy.com/v2/MgM9KAbo2O5SkJ5aGMk2dHo75qnuqYeR`
);

export const wallet = new ethers.Wallet(
  process.env.PRIVATE_KEY as string,
  provider
);
