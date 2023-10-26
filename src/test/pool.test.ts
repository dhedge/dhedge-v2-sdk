import { BigNumber } from "ethers";
import { Dhedge, ethers, Pool } from "..";
import { AssetEnabled, Network } from "../types";
import { CONTRACT_ADDRESS, TEST_POOL } from "./constants";

import {
  beforeAfterReset,
  testingHelper,
  TestingRunParams
} from "./utils/testingHelper";
import { allowanceDelta, balanceDelta } from "./utils/token";

const testPool = ({ wallet, network, provider }: TestingRunParams) => {
  let dhedge: Dhedge;
  let pool: Pool;

  jest.setTimeout(200000);

  describe(`pool on ${network}`, () => {
    beforeAll(async () => {
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);
    });
    beforeAfterReset({ beforeAll, afterAll, provider });

    it("checks fund composition", async () => {
      const result = await pool.getComposition();
      expect(result.length).toBeGreaterThan(0);
    });

    it("approves USDC balance of User for Deposit", async () => {
      await pool.approveDeposit(
        CONTRACT_ADDRESS[network].USDC,
        ethers.constants.MaxUint256
      );
      const UsdcAllowanceDelta = await allowanceDelta(
        pool.signer.address,
        CONTRACT_ADDRESS[network].USDC,
        pool.address,
        pool.signer
      );
      expect(UsdcAllowanceDelta.gt(0));
    });

    it("deposits 1 USDC into Pool", async () => {
      await pool.deposit(CONTRACT_ADDRESS[network].USDC, (1e6).toString());
      const poolTokenDelta = await balanceDelta(
        pool.signer.address,
        pool.address,
        pool.signer
      );
      expect(poolTokenDelta.gt(0));
    });

    it("adds WBTC to enabled assets", async () => {
      const assetsBefore = await pool.getComposition();

      const newAssets: AssetEnabled[] = [
        { asset: CONTRACT_ADDRESS[network].USDC, isDeposit: true },
        { asset: CONTRACT_ADDRESS[network].WETH, isDeposit: false },
        { asset: CONTRACT_ADDRESS[network].WBTC, isDeposit: false }
      ];
      await pool.changeAssets(newAssets);
      const assetsAfter = await pool.getComposition();
      if (assetsBefore.length < newAssets.length) {
        expect(assetsAfter.length).toBeGreaterThan(assetsBefore.length);
      } else {
        expect(assetsAfter.length).toBeLessThanOrEqual(assetsBefore.length);
      }
    });

    it("get available Manager Fee", async () => {
      const result = await pool.getAvailableManagerFee();
      expect(result).toBeInstanceOf(BigNumber);
    });

    it("mintManagerFee; should not revert", async () => {
      const tx = await pool.mintManagerFee();
      expect(tx).toHaveProperty("wait");
    });

    it("withdraw 0.1 pool token into Pool", async () => {
      await provider.send("evm_increaseTime", [24 * 60 * 60]);
      await provider.send("evm_mine", []);
      await pool.withdraw((0.1 * 1e18).toString());
      const poolTokenDelta = await balanceDelta(
        pool.signer.address,
        pool.address,
        pool.signer
      );
      expect(poolTokenDelta.lt(0));
    });
  });
};

testingHelper({
  network: Network.POLYGON,
  testingRun: testPool
});

// testingHelper({
//   network: Network.OPTIMISM,
//   testingRun: testPool
// });
