import { BigNumber, Contract, ethers } from "ethers";
import { Network } from "../../types";
import { getWalletData } from "../wallet";
import {
  CONTRACT_ADDRESS,
  USDC_BALANCEOF_SLOT,
  WETH_BALANCEOF_SLOT
} from "../constants";
import { Pool } from "../../entities";
import AssetHandler from "../../abi/AssetHandler.json";

export type TestingRunParams = {
  network: Network;
  wallet: ethers.Wallet;
  provider: ethers.providers.JsonRpcProvider;
  rpcUrl: string;
};

type TestHelperParams = {
  testingRun: (testingRunParams: TestingRunParams) => void;
} & { network: Network; onFork?: boolean };

export const testingHelper = ({
  network,
  onFork = true,
  testingRun
}: TestHelperParams): void => {
  const { wallet, provider, rpcUrl } = getWalletData(network, onFork);
  testingRun({ network, wallet, provider, rpcUrl });
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

export const setTokenAmount = async ({
  amount,
  userAddress,
  tokenAddress,
  slot,
  provider
}: {
  amount: string;
  userAddress: string;
  tokenAddress: string;
  slot: number | string;
  provider: ethers.providers.JsonRpcProvider;
}): Promise<void> => {
  const toBytes32 = (bn: string) => {
    return ethers.utils.hexlify(
      ethers.utils.zeroPad(BigNumber.from(bn).toHexString(), 32)
    );
  };
  const index = ethers.utils.solidityKeccak256(
    ["uint256", "uint256"],
    [userAddress, slot] // key, slot
  );
  await provider.send("hardhat_setStorageAt", [
    tokenAddress,
    index,
    toBytes32(amount).toString()
  ]);
  await provider.send("evm_mine", []);
};
export const setUSDCAmount = async ({
  provider,
  userAddress,
  amount,
  network
}: {
  amount: string;
  userAddress: string;
  provider: ethers.providers.JsonRpcProvider;
  network: Network;
}): Promise<void> => {
  await setTokenAmount({
    amount,
    userAddress,
    provider,
    tokenAddress: CONTRACT_ADDRESS[network].USDC,
    slot: USDC_BALANCEOF_SLOT[network]
  });
};

export const setWETHAmount = async ({
  provider,
  userAddress,
  amount,
  network
}: {
  amount: string;
  userAddress: string;
  provider: ethers.providers.JsonRpcProvider;
  network: Network;
}): Promise<void> => {
  await setTokenAmount({
    amount,
    userAddress,
    provider,
    tokenAddress: CONTRACT_ADDRESS[network].WETH,
    slot: WETH_BALANCEOF_SLOT[network]
  });
};

export const wait = (seconds: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
};

export const runWithImpersonateAccount = async (
  {
    account,
    provider
  }: {
    account: string;
    provider: ethers.providers.JsonRpcProvider;
  },
  fnToRun: ({ signer }: { signer: ethers.providers.JsonRpcSigner }) => void
): Promise<void> => {
  await provider.send("hardhat_impersonateAccount", [account]);

  await provider.send("hardhat_setBalance", [
    account,
    ethers.utils.hexValue(ethers.utils.parseEther("1000"))
  ]);
  const signer = provider.getSigner(account);
  await fnToRun({ signer });

  await provider.send("hardhat_stopImpersonatingAccount", [account]);
};

export const setChainlinkTimeout = async (
  {
    pool,
    provider
  }: {
    pool: Pool;
    provider: ethers.providers.JsonRpcProvider;
  },
  time: number
): Promise<void> => {
  const assetHandler = await pool.factory.callStatic.getAssetHandler();
  const assetHandlerContract = new Contract(
    assetHandler,
    AssetHandler.abi,
    provider
  );
  const ownerOfAssetHandler = await assetHandlerContract.callStatic.owner();
  await runWithImpersonateAccount(
    { provider, account: ownerOfAssetHandler },
    async ({ signer }) => {
      await assetHandlerContract
        .connect(signer)
        .functions.setChainlinkTimeout(time);
    }
  );
};
