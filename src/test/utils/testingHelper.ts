/* eslint-disable @typescript-eslint/no-explicit-any */
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
import PoolLogicAbi from "../../abi/PoolLogic.json";
import PoolManagerLogicAbi from "../../abi/PoolManagerLogic.json";

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
  beforeAll: any;
  afterAll: any;
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

// Fixes oracle staleness reverts on hardhat forks for ChainlinkPythPriceAggregator and PythPriceAggregator.
// These aggregators have their own maxAge staleness checks separate from the AssetHandler's chainlinkTimeout.
// This function dynamically finds all such aggregators for a pool's supported assets and overrides
// their maxAge fields to max uint32 (0xffffffff, ~136 years).
//
// Slot layouts below are written in big-endian hex order (high-order bytes first), matching the 64-char
// string returned by eth_getStorageAt. Within a packed slot, Solidity lays fields out from the low-order
// end in declaration order — so the first declared field ends up on the right side of the hex string.
//
// ChainlinkPythPriceAggregator storage layout:
//   slot 0: asset (address)
//   slot 1: oracleData.onchainOracle = [8 bytes padding][4 bytes maxAge][20 bytes oracleContract]
//           → maxAge at hex offset 16
//   slot 2: oracleData.offchainOracle.priceId (bytes32)
//   slot 3: oracleData.offchainOracle = [24 bytes padding][4 bytes maxAge][4 bytes minConfidenceRatio]
//           → maxAge at hex offset 48
//
// PythPriceAggregator storage layout:
//   slot 0: asset (address)
//   slot 1: oracleData.priceId (bytes32)
//   slot 2: oracleData = [24 bytes padding][4 bytes maxAge][4 bytes minConfidenceRatio]
//           → maxAge at hex offset 48
const MAX_UINT32_HEX = "ffffffff";

const overrideMaxAgeInSlot = async (
  provider: ethers.providers.JsonRpcProvider,
  contractAddress: string,
  slotIndex: string,
  maxAgeHexOffset: number // character offset of maxAge within the 64-char hex string
): Promise<void> => {
  const slot: string = await provider.send("eth_getStorageAt", [
    contractAddress,
    slotIndex,
    "latest"
  ]);
  const hex = slot.slice(2); // remove 0x
  const newHex =
    hex.slice(0, maxAgeHexOffset) +
    MAX_UINT32_HEX +
    hex.slice(maxAgeHexOffset + 8);
  await provider.send("hardhat_setStorageAt", [
    contractAddress,
    slotIndex,
    "0x" + newHex
  ]);
};

export const fixOracleAggregatorStaleness = async ({
  pool,
  provider
}: {
  pool: Pool;
  provider: ethers.providers.JsonRpcProvider;
}): Promise<void> => {
  const assetHandlerAddress = await pool.factory.callStatic.getAssetHandler();
  const assetHandlerContract = new Contract(
    assetHandlerAddress,
    AssetHandler.abi,
    provider
  );

  // Resolve managerLogic from poolLogic to support both isDhedge=true and isDhedge=false pools
  const poolLogic = new Contract(pool.address, PoolLogicAbi.abi, provider);
  const managerLogicAddress: string = await poolLogic.poolManagerLogic();
  const managerLogic = new Contract(
    managerLogicAddress,
    PoolManagerLogicAbi.abi,
    provider
  );
  const supportedAssets: {
    asset: string;
  }[] = await managerLogic.getSupportedAssets();

  // ABI fragments to detect aggregator type
  const chainlinkPythAbi = [
    "function oracleData() view returns (address oracleContract, uint32 maxAge)"
  ];
  const pythAbi = [
    "function oracleData() view returns (bytes32 priceId, uint32 maxAge, uint32 minConfidenceRatio)"
  ];

  for (const { asset } of supportedAssets) {
    try {
      const aggregatorAddress: string = await assetHandlerContract.priceAggregators(
        asset
      );
      if (aggregatorAddress === ethers.constants.AddressZero) continue;

      // Try ChainlinkPythPriceAggregator first (has onchainOracle + offchainOracle)
      const agg = new Contract(aggregatorAddress, chainlinkPythAbi, provider);
      try {
        await agg.oracleData();
        // ChainlinkPythPriceAggregator detected.
        // Slot 1 layout: [8 bytes padding][4 bytes maxAge][20 bytes oracleContract] → maxAge at offset 16
        await overrideMaxAgeInSlot(provider, aggregatorAddress, "0x1", 16);
        // Slot 3 layout: [24 bytes padding][4 bytes maxAge][4 bytes minConfidenceRatio] → maxAge at offset 48
        await overrideMaxAgeInSlot(provider, aggregatorAddress, "0x3", 48);
        continue;
      } catch {
        // Not a ChainlinkPythPriceAggregator
      }

      // Try PythPriceAggregator (has only offchainOracle)
      const pythAgg = new Contract(aggregatorAddress, pythAbi, provider);
      try {
        await pythAgg.oracleData();
        // PythPriceAggregator detected.
        // Slot 2 layout: [24 bytes padding][4 bytes maxAge][4 bytes minConfidenceRatio] → maxAge at offset 48
        await overrideMaxAgeInSlot(provider, aggregatorAddress, "0x2", 48);
      } catch {
        // Not a PythPriceAggregator either — skip
      }
    } catch {
      // No aggregator set for this asset — skip
    }
  }
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
