import { ethers } from "ethers";
import { Network } from "../types";
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

export const networkPortMap = {
  [Network.POLYGON]: 8542,
  [Network.OPTIMISM]: 8544,
  [Network.ARBITRUM]: 8540,
  [Network.BASE]: 8546,
  [Network.SONIC]: 8547
};

export const getWalletData = (
  network: Network,
  onFork = true
): {
  wallet: ethers.Wallet;
  provider: ethers.providers.JsonRpcProvider;
  rpcUrl: string;
} => {
  const rpcUrl = onFork
    ? `http://127.0.0.1:${networkPortMap[network]}/`
    : process.env[`${network.toUpperCase()}_URL`] || "";
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  return {
    wallet: new ethers.Wallet(process.env.PRIVATE_KEY as string, provider),
    provider,
    rpcUrl
  };
};
