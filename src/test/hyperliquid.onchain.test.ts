/* eslint-disable @typescript-eslint/no-non-null-assertion */

/**
 * Hyperliquid on-chain tests for deposit/withdraw/perp-spot/open/close flows.
 * These require a live chain connection (onFork: false) because Hyperliquid
 * precompile and CoreWriter state cannot be faithfully forked.
 *
 * Prerequisites:
 *   - PRIVATE_KEY in .env (must be the pool manager or trader)
 *   - HYPERLIQUID_URL in .env
 *   - The test pool must hold USDC and an existing ETH perp position
 *   - Spot wallet must hold the amount expected by the withdraw test
 */

import { ethers } from "ethers";
import { Dhedge, Pool } from "..";

import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import { routerAddress } from "../config";
import { getTxOptions } from "./txOptions";

import { TestingRunParams, testingHelper } from "./utils/testingHelper";

const testHyperliquid = ({ wallet, network }: TestingRunParams) => {
  const USDC = CONTRACT_ADDRESS[network].USDC;

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(200000);

  describe(`pool on ${network}`, () => {
    beforeAll(async () => {
      if (!process.env.PRIVATE_KEY || !process.env.HYPERLIQUID_URL) {
        console.warn(
          "Skipping hyperliquid on-chain tests: PRIVATE_KEY and HYPERLIQUID_URL env vars required"
        );
        return;
      }
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);
    });

    it("approves unlimited USDC on Hyperliquid Core Wallet", async () => {
      if (!process.env.PRIVATE_KEY || !process.env.HYPERLIQUID_URL) return;
      const tx = await pool.approve(
        Dapp.HYPERLIQUID,
        USDC,
        MAX_AMOUNT,
        await getTxOptions(network)
      );
      await tx.wait(1);
      const iERC20 = new ethers.Contract(
        USDC,
        ["function allowance(address,address) view returns (uint256)"],
        pool.signer
      );
      const allowance = await iERC20.allowance(
        pool.address,
        routerAddress[network][Dapp.HYPERLIQUID]!
      );
      expect(allowance.gt(0)).toBe(true);
    });

    it("deposits 30 USDC into Hyperliquid Core Wallet", async () => {
      if (!process.env.PRIVATE_KEY || !process.env.HYPERLIQUID_URL) return;
      const usdcBefore = await pool.utils.getBalance(USDC, pool.address);
      const tx = await pool.depositHyperliquid(
        "30000000", // 30 USDC (6 decimals)
        4294967295,
        await getTxOptions(network)
      );
      await tx.wait(1);
      const usdcAfter = await pool.utils.getBalance(USDC, pool.address);
      expect(usdcBefore.sub(usdcAfter).eq("30000000")).toBe(true);
    });

    it("moves 5 USDC from Perp (dex 0) to Spot wallet", async () => {
      if (!process.env.PRIVATE_KEY || !process.env.HYPERLIQUID_URL) return;
      const tx = await pool.perpToSpotHyperliquid(
        0,
        "5000000", // 5 USDC (6 decimals)
        await getTxOptions(network)
      );
      await tx.wait(1);
      expect(tx).toBeDefined();
    });

    it("withdraws USDC from Hyperliquid Spot Wallet", async () => {
      if (!process.env.PRIVATE_KEY || !process.env.HYPERLIQUID_URL) return;
      const tx = await pool.withdrawHyperliquid(
        "784577548", // 784.577548 USDC (6 decimals)
        await getTxOptions(network)
      );
      await tx.wait(1);
      expect(tx).toBeDefined();
    });

    it("opens a XAUT0 spot buy order", async () => {
      if (!process.env.PRIVATE_KEY || !process.env.HYPERLIQUID_URL) return;
      const tx = await pool.openMarketOrderHyperliquid(
        10182, // XAUT0/USDC spot asset id (10000 + spot index 182)
        true, // long
        25, // $25 notional
        1, // 1% slippage
        await getTxOptions(network)
      );
      await tx.wait(1);
      expect(tx).toBeDefined();
    });

    it("closes 50% of ETH perp position", async () => {
      if (!process.env.PRIVATE_KEY || !process.env.HYPERLIQUID_URL) return;
      const tx = await pool.closePositionHyperliquid(
        1, // ETH Perp asset id
        50, // 50% to close
        1, // 1% slippage
        await getTxOptions(network)
      );
      await tx.wait(1);
      expect(tx).toBeDefined();
    });
  });
};

// Requires live chain — cannot run on fork
testingHelper({
  network: Network.HYPERLIQUID,
  testingRun: testHyperliquid,
  onFork: false
});
