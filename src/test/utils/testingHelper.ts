import { ethers } from "ethers";
import { Network } from "../../types";
import { getWalletData } from "../wallet";

export type TestingRunParams = {
  network: Network;
  wallet: ethers.Wallet;
  provider: ethers.providers.JsonRpcProvider;
};

type TestHelperParams = {
  testingRun: (testingRunParams: TestingRunParams) => void;
} & { network: Network };

export const testingHelper = ({
  network,
  testingRun
}: TestHelperParams): void => {
  const { wallet, provider } = getWalletData(network);
  testingRun({ network, wallet, provider });
};

export const beforeAfterReset = ({
  beforeAll,
  afterAll,
  provider
}: {
  beforeAll: jest.Lifecycle;
  afterAll: jest.Lifecycle;
  provider: ethers.providers.JsonRpcProvider;
}): void => {
  let snapshot = "";
  beforeAll(async () => {
    snapshot = (await provider.send("evm_snapshot", [])) as string;
    await provider.send("evm_mine", []);
  });

  afterAll(async () => {
    await provider.send("evm_revert", [snapshot]);
    await provider.send("evm_mine", []);
  });
};
