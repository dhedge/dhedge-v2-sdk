/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { ethers } from "ethers";
import { Dhedge, Pool } from "..";
import { limitBuyManagerAddress } from "../config";

import { Network } from "../types";
import { MAX_AMOUNT, TEST_POOL } from "./constants";
import { testingHelper, TestingRunParams } from "./utils/testingHelper";

// const TOROS_BTCBULL3X = "0xad38255febd566809ae387d5be66ecd287947cb9";
const WBTC = "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f"; // WBTC

const testTorosLimitBuyOrder = ({ wallet, network }: TestingRunParams) => {
  // const ORDER_AMOUNT = ethers.utils.parseEther("0.001");
  // const MIN_TRIGGER = ethers.utils.parseEther("50000");
  // const MAX_TRIGGER = ethers.utils.parseEther("200000");

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`toros limit buy order on ${network}`, () => {
    beforeAll(async () => {
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);
    });

    it("approves Toros vault token for LimitOrderManager", async () => {
      const tx = await pool.approveTorosLimitBuyOrder(WBTC, MAX_AMOUNT);
      await tx.wait(1);
      const iERC20 = new ethers.Contract(
        WBTC,
        ["function allowance(address,address) view returns (uint256)"],
        pool.signer
      );
      const allowance = await iERC20.allowance(
        pool.address,
        limitBuyManagerAddress[network]
      );
      expect(allowance.gt(0)).toBe(true);
    });

    // it("creates a limit buy order", async () => {
    //   const tx = await pool.createTorosLimitBuyOrder(
    //     TOROS_BTCBULL3X,
    //     WBTC,
    //     ORDER_AMOUNT,
    //     WBTC,
    //     MIN_TRIGGER,
    //     MAX_TRIGGER,
    //     0.5,
    //     7
    //   );
    //   await tx.wait(1);
    // });
  });
};

testingHelper({
  network: Network.ARBITRUM,
  testingRun: testTorosLimitBuyOrder,
  onFork: false
});
