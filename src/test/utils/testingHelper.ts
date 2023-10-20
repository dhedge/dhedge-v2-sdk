import { ethers } from "ethers";
import { Network } from "../../types";
import { getWallet } from "../wallet";

export type TestingRunParams = {
  network: Network;
  wallet: ethers.Wallet;
};

type TestHelperParams = {
  testingRun: (testingRunParams: TestingRunParams) => void;
} & { network: Network };

export const testingHelper = ({
  network,
  testingRun
}: TestHelperParams): void => {
  const wallet = getWallet(network);
  testingRun({ network, wallet });
};
