/* eslint-disable @typescript-eslint/no-non-null-assertion */

/**
 * Pendle mint on-chain tests for PT/SY minting on Plasma.
 * These require a live chain connection (onFork: false) because Pendle's
 * SDK router endpoint only returns swap data against real chain state.
 *
 * Prerequisites:
 *   - PRIVATE_KEY in .env (must be the pool manager or trader)
 *   - PLASMA_URL in .env
 *   - The test pool must already hold a non-zero USDE balance
 */

import { Dhedge, Pool } from "..";

import { Network } from "../types";
import { CONTRACT_ADDRESS, TEST_POOL } from "./constants";
import { getTxOptions } from "./txOptions";
import { TestingRunParams, testingHelper } from "./utils/testingHelper";

const testPendleMint = ({ wallet, network }: TestingRunParams) => {
  const USDE = CONTRACT_ADDRESS[network].USDE;
  const PTJan26Usde = "0x93b544c330f60a2aa05ced87aeeffb8d38fd8c9a";

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`pool on ${network}`, () => {
    beforeAll(async () => {
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);
      const usdeBalance = await pool.utils.getBalance(USDE, pool.address);
      if (usdeBalance.isZero()) {
        throw new Error("pool has no USDE — fund the pool before running");
      }
    });

    it("can get TX Data for mint PT and SY", async () => {
      const usdeBalance = await pool.utils.getBalance(USDE, pool.address);
      const { txData, minAmountOut } = await pool.mintPendle(
        USDE,
        PTJan26Usde,
        usdeBalance,
        0.5,
        null,
        { onlyGetTxData: true, estimateGas: true }
      );
      expect(txData).not.toBeNull();
      expect(minAmountOut).not.toBeNull();
    });

    it("mints PT and SY", async () => {
      const usdeBalance = await pool.utils.getBalance(USDE, pool.address);
      const tx = await pool.mintPendle(
        USDE,
        PTJan26Usde,
        usdeBalance,
        0.5,
        await getTxOptions(network)
      );
      await tx.wait(1);
      const ptBalance = await pool.utils.getBalance(PTJan26Usde, pool.address);
      expect(ptBalance.gt(0)).toBe(true);
    });
  });
};

testingHelper({
  network: Network.PLASMA,
  onFork: false,
  testingRun: testPendleMint
});
