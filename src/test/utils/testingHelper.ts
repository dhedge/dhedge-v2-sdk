import { ethers } from "ethers";
import { Network } from "../../types";

export type TestingRunParams = {
  network: Network;
  wallet: ethers.Wallet;
};

type TestHelperParams = {
  testingRun: (testingRunParams: TestingRunParams) => void;
} & TestingRunParams;

export const testingHelper = ({
  network,
  wallet,
  testingRun
}: TestHelperParams): void => {
  testingRun({ network, wallet });
};
