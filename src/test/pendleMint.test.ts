/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { Dhedge, Pool } from "..";

import { Network } from "../types";
import { CONTRACT_ADDRESS } from "./constants";
import { getTxOptions } from "./txOptions";
import { TestingRunParams, testingHelper } from "./utils/testingHelper";

const testPendle = ({ wallet, network }: TestingRunParams) => {
  const USDE = CONTRACT_ADDRESS[network].USDE;
  const PTJan26Usde = "0x93b544c330f60a2aa05ced87aeeffb8d38fd8c9a";

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`pool on ${network}`, () => {
    beforeAll(async () => {
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(
        "0xdad21646ebb0997eb59de1f6a68a67059daf4c31"
      );
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

    it("can get for mint PT and SY", async () => {
      const usdeBalance = await pool.utils.getBalance(USDE, pool.address);
      await pool.mintPendle(
        USDE,
        PTJan26Usde,
        usdeBalance,
        0.5,
        await getTxOptions(network)
      );
      const ptBalance = await pool.utils.getBalance(PTJan26Usde, pool.address);
      expect(ptBalance.gt(0)).toBe(true);
    });
  });
};

testingHelper({
  network: Network.PLASMA,
  onFork: false,
  testingRun: testPendle
});
