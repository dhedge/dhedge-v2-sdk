/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { Dhedge, Pool } from "..";
import { Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import {
  TestingRunParams,
  beforeAfterReset,
  setWETHAmount,
  runWithImpersonateAccount,
  testingHelper
} from "./utils/testingHelper";
import { balanceDelta } from "./utils/token";

const testFluid = ({ wallet, network, provider }: TestingRunParams) => {
  const WETH = CONTRACT_ADDRESS[network].WETH;
  const FLUID_WETH = CONTRACT_ADDRESS[network].FLUID_WETH;

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`[${network}] fluid tests`, () => {
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

      // Impersonate pool manager to set trader and configure assets
      await runWithImpersonateAccount(
        { provider, account: await pool.managerLogic.manager() },
        async ({ signer }) => {
          await pool.managerLogic.connect(signer).setTrader(wallet.address);
          const newAssets = [
            [WETH, true],
            [FLUID_WETH, false]
          ];
          await pool.managerLogic.connect(signer).changeAssets(newAssets, []);
        }
      );
    });
    beforeAfterReset({ beforeAll, afterAll, provider });

    it("approves unlimited WETH for fWETH market", async () => {
      const tx = await pool.approveSpender(FLUID_WETH, WETH, MAX_AMOUNT);
      await tx.wait(1);
      const iERC20 = new ethers.Contract(
        WETH,
        ["function allowance(address,address) view returns (uint256)"],
        pool.signer
      );
      const wethAllowance = await iERC20.allowance(pool.address, FLUID_WETH);
      expect(wethAllowance.gt(0)).toBe(true);
    });

    it("lends WETH to Fluid WETH market", async () => {
      const wethBalance = await pool.utils.getBalance(WETH, pool.address);
      await pool.lendCompoundV3(FLUID_WETH, WETH, wethBalance);

      const fWETHTokenDelta = await balanceDelta(
        pool.address,
        FLUID_WETH,
        pool.signer
      );
      expect(fWETHTokenDelta.gt(0)).toBe(true);
    });

    it("withdraws WETH from Fluid WETH market", async () => {
      const fWETHBalance = await pool.utils.getBalance(
        FLUID_WETH,
        pool.address
      );
      await pool.withdrawCompoundV3(FLUID_WETH, WETH, fWETHBalance);
      const wethBalanceDelta = await balanceDelta(
        pool.address,
        WETH,
        pool.signer
      );
      expect(wethBalanceDelta.gt(0)).toBe(true);
    });
  });
};

testingHelper({
  network: Network.ARBITRUM,
  testingRun: testFluid
});
