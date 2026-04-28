/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { Dhedge, Pool } from "..";
import { routerAddress } from "../config";
import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import {
  TestingRunParams,
  fixOracleAggregatorStaleness,
  runWithImpersonateAccount,
  setChainlinkTimeout,
  setUSDCAmount,
  setWETHAmount,
  testingHelper
} from "./utils/testingHelper";
import { balanceDelta } from "./utils/token";

// Velodrome V2 VARIABLE USDC/WETH pool (native USDC)
const USDC_WETH_Lp = "0xF4F2657AE744354bAcA871E56775e5083F7276Ab";
const USDC_WETH_Gauge = "0xBde5E1592AEb3D8396b90c4B4ba274E5Ae31e552";

const testVelodromeV2 = ({ wallet, network, provider }: TestingRunParams) => {
  const USDC = CONTRACT_ADDRESS[network].USDC;
  const WETH = CONTRACT_ADDRESS[network].WETH;

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`pool on ${network}`, () => {
    beforeAll(async () => {
      await provider.send("hardhat_setBalance", [
        wallet.address,
        "0x10000000000000000"
      ]);
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);

      await setChainlinkTimeout({ pool, provider }, 86400 * 365);
      await fixOracleAggregatorStaleness({ pool, provider });

      await runWithImpersonateAccount(
        { provider, account: await pool.managerLogic.manager() },
        async ({ signer }) => {
          await pool.managerLogic.connect(signer).setTrader(wallet.address);
          await pool.managerLogic.connect(signer).changeAssets(
            [
              [USDC, true],
              [WETH, true],
              [USDC_WETH_Lp, false]
            ],
            []
          );
        }
      );

      await setUSDCAmount({
        amount: new BigNumber(10000).times(1e6).toFixed(0),
        userAddress: pool.address,
        network,
        provider
      });
      await setWETHAmount({
        amount: new BigNumber(3).times(1e18).toFixed(0),
        userAddress: pool.address,
        network,
        provider
      });
    });

    it("approves unlimited WETH and USDC on for Velodrome", async () => {
      await pool.approve(Dapp.VELODROMEV2, WETH, MAX_AMOUNT);
      await pool.approve(Dapp.VELODROMEV2, USDC, MAX_AMOUNT);
      const iERC20 = new ethers.Contract(
        USDC,
        ["function allowance(address,address) view returns (uint256)"],
        pool.signer
      );
      const usdcAllowance = await iERC20.allowance(
        pool.address,
        routerAddress[network].velodromeV2!
      );
      expect(usdcAllowance.gt(0)).toBe(true);
    });

    it("adds USDC and WETH to a Velodrome volatile pool", async () => {
      await pool.addLiquidityVelodromeV2(
        USDC,
        WETH,
        new BigNumber(100).times(1e6).toFixed(0),
        new BigNumber(0.05).times(1e18).toFixed(0),
        false
      );

      const lpTokenDelta = await balanceDelta(
        pool.address,
        USDC_WETH_Lp,
        pool.signer
      );
      expect(lpTokenDelta.gt(0)).toBe(true);
    });

    it("should stake USDC-WETH LP in a gauge", async () => {
      const balance = await dhedge.utils.getBalance(USDC_WETH_Lp, pool.address);
      await pool.approveSpender(USDC_WETH_Gauge, USDC_WETH_Lp, MAX_AMOUNT);
      await pool.stakeInGauge(Dapp.VELODROMEV2, USDC_WETH_Gauge, balance);
      const gaugeBalance = await balanceDelta(
        pool.address,
        USDC_WETH_Lp,
        pool.signer
      );
      expect(gaugeBalance.lt(0)).toBe(true);
    });

    it("should claim rewards from Gauge", async () => {
      const tx = await pool.claimFees(Dapp.VELODROMEV2, USDC_WETH_Gauge);
      expect(tx).not.toBe(null);
    });

    it("should unStake USDC-WETH LP from a gauge", async () => {
      const gaugeBalance = await dhedge.utils.getBalance(
        USDC_WETH_Gauge,
        pool.address
      );
      await pool.unstakeFromGauge(USDC_WETH_Gauge, gaugeBalance);
      const lpTokenDelta = await balanceDelta(
        pool.address,
        USDC_WETH_Lp,
        pool.signer
      );
      expect(lpTokenDelta.gt(0)).toBe(true);
    });

    it("approves unlimited USDC-WETH LP for Velodrome", async () => {
      await pool.approve(Dapp.VELODROMEV2, USDC_WETH_Lp, MAX_AMOUNT);
      const iERC20 = new ethers.Contract(
        USDC_WETH_Lp,
        ["function allowance(address,address) view returns (uint256)"],
        pool.signer
      );
      const lpAllowance = await iERC20.allowance(
        pool.address,
        routerAddress[network].velodromeV2!
      );
      expect(lpAllowance.gt(0)).toBe(true);
    });

    it("should remove all liquidity from an existing pool ", async () => {
      const balance = await dhedge.utils.getBalance(USDC_WETH_Lp, pool.address);
      await pool.removeLiquidityVelodromeV2(USDC, WETH, balance, false);
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
  network: Network.OPTIMISM,
  testingRun: testVelodromeV2
});
