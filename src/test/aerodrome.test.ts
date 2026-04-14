/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import BigNumber from "bignumber.js";
import { Dhedge, ethers, Pool } from "..";
import { routerAddress } from "../config";
import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import {
  TestingRunParams,
  beforeAfterReset,
  setUSDCAmount,
  setWETHAmount,
  runWithImpersonateAccount,
  testingHelper
} from "./utils/testingHelper";
import { allowanceDelta, balanceDelta } from "./utils/token";

const testAerodrome = ({ wallet, network, provider }: TestingRunParams) => {
  const WETH_USDC_Lp = "0xcDAC0d6c6C59727a65F871236188350531885C43";
  const WETH_USDC__Gauge = "0x519BBD1Dd8C6A94C46080E24f316c14Ee758C025";

  const USDC = CONTRACT_ADDRESS[network].USDC;
  const WETH = CONTRACT_ADDRESS[network].WETH;
  const AERO = "0x940181a94A35A4569E4529A3CDfB74e38FD98631";

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`[${network}] aerodrome tests`, () => {
    beforeAll(async () => {
      // top up ETH (gas)
      await provider.send("hardhat_setBalance", [
        wallet.address,
        "0x10000000000000000"
      ]);
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);

      // Fund pool with USDC and WETH
      await setUSDCAmount({
        amount: new BigNumber(10000).times(1e6).toFixed(0),
        userAddress: pool.address,
        network,
        provider
      });
      await setWETHAmount({
        amount: new BigNumber(5).times(1e18).toFixed(0),
        userAddress: pool.address,
        network,
        provider
      });

      // Impersonate the pool manager to set trader and configure assets
      await runWithImpersonateAccount(
        { provider, account: await pool.managerLogic.manager() },
        async ({ signer }) => {
          await pool.managerLogic.connect(signer).setTrader(wallet.address);
          const newAssets = [
            [USDC, true],
            [WETH, true],
            [WETH_USDC_Lp, false],
            [AERO, false]
          ];
          await pool.managerLogic.connect(signer).changeAssets(newAssets, []);
        }
      );
    });
    beforeAfterReset({ beforeAll, afterAll, provider });

    it("approves unlimited USDC and WETH for Aerodrome", async () => {
      await pool.approve(Dapp.AERODROME, USDC, MAX_AMOUNT);
      await pool.approve(Dapp.AERODROME, WETH, MAX_AMOUNT);
      const usdcAllowance = await new ethers.Contract(
        USDC,
        ["function allowance(address,address) view returns (uint256)"],
        pool.signer
      ).allowance(pool.address, routerAddress[network].aerodrome!);
      expect(usdcAllowance.gt(0)).toBe(true);
    });

    it("adds USDC and WETH to an Aerodrome volatile pool", async () => {
      const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
      const wethBalance = await pool.utils.getBalance(WETH, pool.address);
      await pool.addLiquidityV2(
        Dapp.AERODROME,
        WETH,
        USDC,
        wethBalance,
        usdcBalance,
        false
      );

      const lpTokenDelta = await balanceDelta(
        pool.address,
        WETH_USDC_Lp,
        pool.signer
      );
      expect(lpTokenDelta.gt(0)).toBe(true);
    });

    it("should stake WETH-USDC LP in a gauge", async () => {
      const balance = await dhedge.utils.getBalance(WETH_USDC_Lp, pool.address);
      await pool.approveSpender(WETH_USDC__Gauge, WETH_USDC_Lp, MAX_AMOUNT);
      await pool.stakeInGauge(Dapp.AERODROME, WETH_USDC__Gauge, balance);
      const gaugeBalance = await balanceDelta(
        pool.address,
        WETH_USDC__Gauge,
        pool.signer
      );
      expect(gaugeBalance.gt(0)).toBe(true);
    });

    it("should claim rewards from Gauge", async () => {
      await provider.send("evm_increaseTime", [24 * 60 * 60]); // 1 day
      await provider.send("evm_mine", []);
      const claimTx = await pool.claimFees(Dapp.AERODROME, WETH_USDC__Gauge);
      expect(claimTx).not.toBe(null);
      const aeroBalanceDelta = await balanceDelta(
        pool.address,
        AERO,
        pool.signer
      );
      expect(aeroBalanceDelta.gt(0)).toBe(true);
    });

    it("should unstake WETH-USDC LP from a gauge", async () => {
      const gaugeBalance = await dhedge.utils.getBalance(
        WETH_USDC__Gauge,
        pool.address
      );
      await pool.unstakeFromGauge(WETH_USDC__Gauge, gaugeBalance);
      const lpTokenDelta = await balanceDelta(
        pool.address,
        WETH_USDC_Lp,
        pool.signer
      );
      expect(lpTokenDelta.gt(0)).toBe(true);
    });

    it("approves unlimited WETH-USDC LP for Aerodrome", async () => {
      await pool.approve(Dapp.AERODROME, WETH_USDC_Lp, MAX_AMOUNT);
      const lpAllowanceDelta = await allowanceDelta(
        pool.address,
        WETH_USDC_Lp,
        routerAddress[network].aerodrome!,
        pool.signer
      );
      expect(lpAllowanceDelta.gt(0)).toBe(true);
    });

    it("should remove all liquidity from an existing pool", async () => {
      const balance = await dhedge.utils.getBalance(WETH_USDC_Lp, pool.address);
      await pool.removeLiquidityV2(Dapp.AERODROME, WETH, USDC, balance, false);
      const usdcBalanceDelta = await balanceDelta(
        pool.address,
        USDC,
        pool.signer
      );
      const wethBalanceDelta = await balanceDelta(
        pool.address,
        WETH,
        pool.signer
      );
      expect(usdcBalanceDelta.gt(0)).toBe(true);
      expect(wethBalanceDelta.gt(0)).toBe(true);
    });
  });
};

testingHelper({
  network: Network.BASE,
  testingRun: testAerodrome
});
