import { Dhedge, ethers, Network, Pool } from "..";
import { AssetEnabled } from "../types";
import { CONTRACT_ADDRESS } from "./constants";

import {
  testingHelper,
  TestingRunParams,
  beforeAfterReset,
  setUSDCAmount,
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
