import { Dhedge } from "..";
import { Network } from "../types";
import { CONTRACT_ADDRESS, TEST_POOL } from "./constants";
import {
  testingHelper,
  TestingRunParams,
  beforeAfterReset
} from "./utils/testingHelper";

// To pin a block number for determinism and Hardhat disk caching, add
// hardfork history for Polygon in hardhat.config.js and uncomment the
// hardhat_reset call in beforeAll. Without that config, Hardhat rejects
// historical execution on chain 137.

const testDhedge = ({ wallet, network, provider }: TestingRunParams) => {
  let dhedge: Dhedge;

  jest.setTimeout(200000);

  describe(`dHEDGE on ${network}`, () => {
    beforeAll(async () => {
      // Fund the test wallet with gas
      await provider.send("hardhat_setBalance", [
        wallet.address,
        "0x10000000000000000"
      ]);
      dhedge = new Dhedge(wallet, network);
    });

    beforeAfterReset({ beforeAll, afterAll, provider });

    it("creates a pool with USDC and WETH", async () => {
      const pool = await dhedge.createPool(
        "Test Manager",
        "Test Fund",
        "TEST",
        [
          [CONTRACT_ADDRESS[network].USDC, true],
          [CONTRACT_ADDRESS[network].WETH, false]
        ]
      );
      expect(pool.address).toBeDefined();
      expect(pool.poolLogic.address).toBe(pool.address);
    });

    it("loads an existing pool", async () => {
      const pool = await dhedge.loadPool(TEST_POOL[network]);
      expect(pool.address).toBe(TEST_POOL[network]);
      expect(pool.poolLogic.address).toBe(TEST_POOL[network]);
    });

    it("validates a real pool address", async () => {
      const isValid = await dhedge.validatePool(TEST_POOL[network]);
      expect(isValid).toBe(true);
    });

    it("rejects an invalid pool address", async () => {
      const isValid = await dhedge.validatePool(
        "0x0000000000000000000000000000000000000001"
      );
      expect(isValid).toBe(false);
    });
  });
};

testingHelper({
  network: Network.POLYGON,
  onFork: true,
  testingRun: testDhedge
});
