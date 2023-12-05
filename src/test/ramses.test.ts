/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dhedge, Pool } from "..";
import { routerAddress } from "../config";
import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import {
  TestingRunParams,
  beforeAfterReset,
  testingHelper
} from "./utils/testingHelper";
import { allowanceDelta, balanceDelta } from "./utils/token";
import { getWalletData } from "./wallet";

const testRamses = ({ network, provider }: TestingRunParams) => {
  const USDC_swETH_Lp = "0xf1a5444a7ed5f24962a118512b076a015b0e6c0b";
  const USDC_swETH_Gauge = "0x9765cdaec6395b04737edc22c5b3e7d85677328a";
  const RAM = "0xaaa6c1e32c55a7bfa8066a6fae9b42650f262418";
  const xoRAM = "0xaaa1ee8dc1864ae49185c368e8c64dd780a50fb7";

  const USDC = CONTRACT_ADDRESS[network].USDC;
  const SWETH = CONTRACT_ADDRESS[network].SWETH;

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`[${network}] ramses tests`, () => {
    beforeAll(async () => {
      const { wallet } = getWalletData(network);
      // top up ETH (gas)
      await provider.send("hardhat_setBalance", [
        wallet.address,
        "0x100000000000000"
      ]);
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);
      await pool.trade(Dapp.ONEINCH, USDC, SWETH, (5 * 1e6).toString());
    });
    beforeAfterReset({ beforeAll, afterAll, provider });

    it("approves unlimited USDC and swETH on for Ramses", async () => {
      await pool.approve(Dapp.RAMSES, USDC, MAX_AMOUNT);
      await pool.approve(Dapp.RAMSES, SWETH, MAX_AMOUNT);
      const UsdcAllowanceDelta = await allowanceDelta(
        pool.address,
        USDC,
        routerAddress[network].ramses!,
        pool.signer
      );
      await expect(UsdcAllowanceDelta.gt(0));
    });

    it("adds USDC and swETH to a Ramses volatile pool", async () => {
      const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
      const swethBalance = await pool.utils.getBalance(SWETH, pool.address);
      await pool.addLiquidityV2(
        Dapp.RAMSES,
        USDC,
        SWETH,
        usdcBalance,
        swethBalance,
        false
      );

      const lpTokenDelta = await balanceDelta(
        pool.address,
        USDC_swETH_Lp,
        pool.signer
      );
      expect(lpTokenDelta.gt(0));
    });

    it("should stake USDC-swETH LP in a gauge", async () => {
      const balance = await dhedge.utils.getBalance(
        USDC_swETH_Lp,
        pool.address
      );
      await pool.approveSpender(USDC_swETH_Gauge, USDC_swETH_Lp, MAX_AMOUNT);
      await pool.stakeInGauge(Dapp.RAMSES, USDC_swETH_Gauge, balance);
      const gaugeBalance = await balanceDelta(
        pool.address,
        USDC_swETH_Gauge,
        pool.signer
      );
      expect(gaugeBalance.gt(0));
    });

    it("should claim rewards from Gauge", async () => {
      await provider.send("evm_increaseTime", [24 * 60 * 60]); // 1 day
      await provider.send("evm_mine", []);
      const claimTx = await pool.claimFees(Dapp.RAMSES, USDC_swETH_Gauge);
      expect(claimTx).not.toBe(null);
      const ramBalanceDelta = await balanceDelta(
        pool.address,
        RAM,
        pool.signer
      );
      const xoRamBalanceDelta = await balanceDelta(
        pool.address,
        xoRAM,
        pool.signer
      );
      expect(ramBalanceDelta.gt(0));
      expect(xoRamBalanceDelta.gt(0));
    });

    it("createVest for xoRAM", async () => {
      const xoRAMBalanceBefore = await dhedge.utils.getBalance(
        xoRAM,
        pool.address
      );
      expect(xoRAMBalanceBefore.gt(0));
      const vestTx = await pool.vestTokens(xoRAM, xoRAMBalanceBefore);
      expect(vestTx).not.toBe(null);
      const xoRAMBalanceAfter = await dhedge.utils.getBalance(
        xoRAM,
        pool.address
      );
      expect(xoRAMBalanceAfter.eq(0));
    });

    it("exitVest for xoRAM", async () => {
      await provider.send("evm_increaseTime", [3600 * 24 * 90]); // 90 days
      await provider.send("evm_mine", []);

      const ramBalanceBefore = await dhedge.utils.getBalance(RAM, pool.address);

      const exitvestTx = await pool.exitVestedToken(xoRAM, 0);
      const xoRAMBalanceAfter = await dhedge.utils.getBalance(
        USDC_swETH_Gauge,
        pool.address
      );
      expect(exitvestTx).not.toBe(null);
      const ramBalanceAfter = await dhedge.utils.getBalance(RAM, pool.address);
      expect(xoRAMBalanceAfter.eq(0));
      expect(ramBalanceAfter.gt(ramBalanceBefore));
    });

    it("should unStake USDC-swETH LP from a gauge", async () => {
      const gaugeBalance = await dhedge.utils.getBalance(
        USDC_swETH_Gauge,
        pool.address
      );
      await pool.unstakeFromGauge(USDC_swETH_Gauge, gaugeBalance);
      const lpTokenDelta = await balanceDelta(
        pool.address,
        USDC_swETH_Lp,
        pool.signer
      );
      expect(lpTokenDelta.gt(0));
    });

    it("approves unlimited USDC/swETH LP for Ramses", async () => {
      await pool.approve(Dapp.RAMSES, USDC_swETH_Lp, MAX_AMOUNT);
      const lpAllowanceDelta = await allowanceDelta(
        pool.address,
        USDC_swETH_Lp,
        routerAddress[network].ramses!,
        pool.signer
      );
      expect(lpAllowanceDelta.gt(0));
    });

    it("should remove all liquidity from an existing pool ", async () => {
      const balance = await dhedge.utils.getBalance(
        USDC_swETH_Lp,
        pool.address
      );
      await pool.removeLiquidityV2(Dapp.RAMSES, USDC, SWETH, balance, false);
      const usdcBalanceDelta = await balanceDelta(
        pool.address,
        USDC,
        pool.signer
      );
      const swETHBalanceDelta = await balanceDelta(
        pool.address,
        SWETH,
        pool.signer
      );
      expect(usdcBalanceDelta.gt(0));
      expect(swETHBalanceDelta.gt(0));
    });
  });
};

testingHelper({
  network: Network.ARBITRUM,
  testingRun: testRamses
});
