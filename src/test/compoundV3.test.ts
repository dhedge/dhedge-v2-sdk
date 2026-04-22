/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import BigNumber from "bignumber.js";
import { Dhedge, Pool } from "..";
import { Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import {
  TestingRunParams,
  beforeAfterReset,
  setWETHAmount,
  setChainlinkTimeout,
  fixOracleAggregatorStaleness,
  runWithImpersonateAccount,
  testingHelper
} from "./utils/testingHelper";
import { balanceDelta } from "./utils/token";

const testCompoundV3 = ({ wallet, network, provider }: TestingRunParams) => {
  const WETH = CONTRACT_ADDRESS[network].WETH;
  const COMPOUNDV3_WETH = CONTRACT_ADDRESS[network].COMPOUNDV3_WETH;

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`[${network}] compound V3 tests`, () => {
    beforeAll(async () => {
      await provider.send("hardhat_setBalance", [
        wallet.address,
        "0x10000000000000000"
      ]);
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);

      await setWETHAmount({
        amount: new BigNumber(1e18).toFixed(0),
        userAddress: pool.address,
        network,
        provider
      });

      // Extend oracle timeouts so price feeds work on fork
      await setChainlinkTimeout({ pool, provider }, 86400 * 365);
      await fixOracleAggregatorStaleness({ pool, provider });

      // Impersonate pool manager to set trader and configure assets
      await runWithImpersonateAccount(
        { provider, account: await pool.managerLogic.manager() },
        async ({ signer }) => {
          await pool.managerLogic.connect(signer).setTrader(wallet.address);
          const newAssets = [
            [WETH, true],
            [COMPOUNDV3_WETH, false]
          ];
          await pool.managerLogic.connect(signer).changeAssets(newAssets, []);
        }
      );
    });
    beforeAfterReset({ beforeAll, afterAll, provider });

    it("approves unlimited WETH for cWETHv3 market", async () => {
      await pool.approveSpender(COMPOUNDV3_WETH, WETH, MAX_AMOUNT);
      const wethAllowance = await pool.utils.getBalance(WETH, pool.address);
      expect(wethAllowance).toBeDefined();
    });

    it("lends WETH to CompoundV3 WETH market", async () => {
      const wethBalance = await pool.utils.getBalance(WETH, pool.address);
      await pool.lendCompoundV3(COMPOUNDV3_WETH, WETH, wethBalance);

      const cWETHTokenDelta = await balanceDelta(
        pool.address,
        COMPOUNDV3_WETH,
        pool.signer
      );
      expect(cWETHTokenDelta.gt(0)).toBe(true);
    });

    it("withdraws WETH from CompoundV3 WETH market", async () => {
      // Withdraw half of the originally supplied amount
      const halfWeth = new BigNumber(1e18).div(2).toFixed(0);
      await pool.withdrawCompoundV3(COMPOUNDV3_WETH, WETH, halfWeth);
      const wethBalanceDelta = await balanceDelta(
        pool.address,
        WETH,
        pool.signer
      );
      expect(wethBalanceDelta.gt(0)).toBe(true);
    });

    it("harvests rewards from CompoundV3", async () => {
      await pool.harvestCompoundV3Rewards(COMPOUNDV3_WETH);
    });
  });
};

testingHelper({
  network: Network.ARBITRUM,
  testingRun: testCompoundV3
});
