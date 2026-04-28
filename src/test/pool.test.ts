import BigNumber from "bignumber.js";
import { Dhedge, ethers, Network, Pool } from "..";
import { AssetEnabled } from "../types";
import { CONTRACT_ADDRESS } from "./constants";

import {
  testingHelper,
  TestingRunParams,
  beforeAfterReset,
  setUSDCAmount,
  setWETHAmount,
  setChainlinkTimeout,
  fixOracleAggregatorStaleness
} from "./utils/testingHelper";
import { allowanceDelta, balanceDelta } from "./utils/token";

const testPool = ({ wallet, network, provider }: TestingRunParams) => {
  let dhedge: Dhedge;
  let pool: Pool;

  jest.setTimeout(200000);

  describe(`pool on ${network}`, () => {
    beforeAll(async () => {
      await provider.send("hardhat_setBalance", [
        wallet.address,
        "0x10000000000000000"
      ]);
      dhedge = new Dhedge(wallet, network);

      // Create a fresh pool with USDC and WETH
      pool = await dhedge.createPool("Test Manager", "Pool Test Fund", "PTF", [
        [CONTRACT_ADDRESS[network].USDC, true],
        [CONTRACT_ADDRESS[network].WETH, false]
      ]);

      // Extend oracle timeouts so price feeds work on fork
      await setChainlinkTimeout({ pool, provider }, 86400 * 365);
      await fixOracleAggregatorStaleness({ pool, provider });

      // Fund wallet with USDC for deposit test
      await setUSDCAmount({
        amount: (100 * 1e6).toString(),
        userAddress: wallet.address,
        network,
        provider
      });
    });

    beforeAfterReset({ beforeAll, afterAll, provider });

    it("checks fund composition", async () => {
      const result = await pool.getComposition();
      expect(result.length).toBeGreaterThan(0);
    });

    it("skips removing assets with a non-zero balance and warns", async () => {
      // The pool currently has [USDC, WETH]. PoolManagerLogic.changeAssets
      // reverts on-chain if you try to remove an asset with a non-zero pool
      // balance. Pool.changeAssets() simulates each removal via callStatic
      // and skips the ones that would revert, so the real tx still succeeds.
      // This test proves that path: fund WETH → ask to remove it →
      // expect WETH to stay in the composition and a warn line to be logged.

      // 1. Give WETH a non-zero balance so its removal simulation will revert.
      await setWETHAmount({
        amount: new BigNumber(1).times(1e18).toFixed(0),
        userAddress: pool.address,
        network,
        provider
      });

      // 2. Spy on console.warn so we can assert the skip was reported.
      //    mockImplementation silences the output during the test run.
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {
        /* swallow warnings so they don't pollute test output */
      });

      // 3. Ask changeAssets to end up with [USDC] only — i.e. drop WETH.
      //    Internally, the WETH removal simulation will revert, so WETH is
      //    dropped from `removedAssets` and the real tx never tries to remove it.
      const newAssets: AssetEnabled[] = [
        { asset: CONTRACT_ADDRESS[network].USDC, isDeposit: true }
      ];
      await pool.changeAssets(newAssets);

      // 4. WETH should still be an enabled asset (skip worked).
      const assetsAfter = await pool.getComposition();
      const wethStillPresent = assetsAfter.some(
        a =>
          a.asset.toLowerCase() === CONTRACT_ADDRESS[network].WETH.toLowerCase()
      );
      expect(wethStillPresent).toBe(true);

      // 5. And the skip should have been logged via console.warn.
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("skipping removal of")
      );
      warnSpy.mockRestore();

      // 6. Restore pre-test state: drain WETH so the next test — which
      //    expects WETH to be removable — isn't affected by our funding.
      await setWETHAmount({
        amount: "0",
        userAddress: pool.address,
        network,
        provider
      });
    });

    it("changes enabled assets (removes WETH, keeps USDC only)", async () => {
      const assetsBefore = await pool.getComposition();
      const newAssets: AssetEnabled[] = [
        { asset: CONTRACT_ADDRESS[network].USDC, isDeposit: true }
      ];
      await pool.changeAssets(newAssets);
      const assetsAfter = await pool.getComposition();
      expect(assetsAfter.length).toBeLessThan(assetsBefore.length);
    });

    it("approves USDC for deposit", async () => {
      await pool.approveDeposit(
        CONTRACT_ADDRESS[network].USDC,
        ethers.constants.MaxUint256
      );
      const usdcAllowanceDelta = await allowanceDelta(
        wallet.address,
        CONTRACT_ADDRESS[network].USDC,
        pool.address,
        pool.signer
      );
      expect(usdcAllowanceDelta.gt(0)).toBe(true);
    });

    it("deposits 30 USDC into pool", async () => {
      await pool.deposit(CONTRACT_ADDRESS[network].USDC, (30 * 1e6).toString());
      const poolTokenDelta = await balanceDelta(
        wallet.address,
        pool.address,
        pool.signer
      );
      expect(poolTokenDelta.gt(0)).toBe(true);
    });

    it("gets available manager fee", async () => {
      const result = await pool.getAvailableManagerFee();
      expect(result).toBeDefined();
    });

    it("withdraws pool tokens", async () => {
      // Wait for exit cooldown after deposit
      await provider.send("evm_increaseTime", [24 * 60 * 60]);
      await provider.send("evm_mine", []);
      const poolTokenBalance = await dhedge.utils.getBalance(
        pool.address,
        wallet.address
      );
      expect(poolTokenBalance.gt(0)).toBe(true);
      await pool.withdraw(poolTokenBalance.div(2).toString());
      const poolTokenDelta = await balanceDelta(
        wallet.address,
        pool.address,
        pool.signer
      );
      expect(poolTokenDelta.lt(0)).toBe(true);
    });
  });
};

testingHelper({
  network: Network.ARBITRUM,
  testingRun: testPool,
  onFork: true
});
