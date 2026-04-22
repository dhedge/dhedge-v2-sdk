/* eslint-disable @typescript-eslint/no-non-null-assertion */

/**
 * Toros on-chain tests for init and complete withdrawal.
 * These require a live chain connection (onFork: false) because the
 * withdrawal swap data from DEX aggregators (KyberSwap/1Inch) only
 * works against real chain state, not a Hardhat fork.
 *
 * Prerequisites:
 *   - PRIVATE_KEY in .env (must be the pool manager or trader)
 *   - ARBITRUM_URL in .env
 *   - The test pool must hold Toros tokens ready for withdrawal
 *   - Cooldown period must have passed since the last deposit
 */

import { Dhedge, Pool } from "..";

import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT } from "./constants";
import { getTxOptions } from "./txOptions";
import { testingHelper, TestingRunParams } from "./utils/testingHelper";

const testTorosOnchain = ({ wallet, network }: TestingRunParams) => {
  const USDC = CONTRACT_ADDRESS[network].USDC;
  const TOROS = CONTRACT_ADDRESS[network].TOROS;
  const TEST_POOL_ADDRESS = "0x2d4cddd2c4fa854536593bcf61d0da3b63ed80cb";

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(200000);

  describe(`[${network}] toros on-chain withdrawal tests`, () => {
    beforeAll(async () => {
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL_ADDRESS);
    });

    it("init Toros Token for withdrawal", async () => {
      const torosBalanceBefore = await pool.utils.getBalance(
        TOROS,
        pool.address
      );
      await pool.approve(
        Dapp.TOROS,
        TOROS,
        MAX_AMOUNT,
        await getTxOptions(network)
      );
      const tx = await pool.trade(
        Dapp.TOROS,
        TOROS,
        USDC,
        torosBalanceBefore,
        1.5,
        await getTxOptions(network)
      );
      await tx.wait(4);
      const torosBalanceAfter = await pool.utils.getBalance(
        TOROS,
        pool.address
      );
      expect(torosBalanceAfter.lt(torosBalanceBefore)).toBe(true);
    });

    it("complete withdrawal from Toros asset", async () => {
      const usdcBalanceBefore = await pool.utils.getBalance(USDC, pool.address);
      const tx = await pool.completeTorosWithdrawal(
        USDC,
        1.5,
        await getTxOptions(network)
      );
      await tx.wait(4);
      const usdcBalanceAfter = await pool.utils.getBalance(USDC, pool.address);
      expect(usdcBalanceAfter.gt(usdcBalanceBefore)).toBe(true);
    });
  });
};

// Requires live chain — cannot run on fork
testingHelper({
  network: Network.ARBITRUM,
  testingRun: testTorosOnchain,
  onFork: false
});
