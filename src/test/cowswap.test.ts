/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { Dhedge, Pool } from "..";

import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, TEST_POOL } from "./constants";
import { getTxOptions } from "./txOptions";
import { TestingRunParams, testingHelper } from "./utils/testingHelper";
import { balanceDelta } from "./utils/token";

const testCowswap = ({ wallet, network }: TestingRunParams) => {
  const USDC = CONTRACT_ADDRESS[network].USDC;
  const WETH = CONTRACT_ADDRESS[network].WETH;

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`pool on ${network}`, () => {
    beforeAll(async () => {
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);
    });

    // it("approves unlimited USDC on Cowswap", async () => {
    //   await pool.approveSpender(
    //     "0xC92E8bdf79f0507f65a392b0ab4667716BFE0110", //Vault relayer
    //     USDC,
    //     MAX_AMOUNT,
    //     await getTxOptions(network)
    //   );
    //   const usdcAllowanceDelta = await allowanceDelta(
    //     pool.address,
    //     USDC,
    //     "0xC92E8bdf79f0507f65a392b0ab4667716BFE0110", //Vault relayer
    //     pool.signer
    //   );
    //   await expect(usdcAllowanceDelta.gt(0).toBe(true));
    // });

    // it("gets gas estimation for 2 USDC into WETH on Cowswap", async () => {
    //   const gasEstimate = await pool.trade(
    //     Dapp.COWSWAP,
    //     USDC,
    //     WETH,
    //     "2000000",
    //     1,
    //     await getTxOptions(network),
    //     true
    //   );
    //   console.log(
    //     "Gas estimate for trading 2 USDC to WETH on Cowswap:",
    //     gasEstimate
    //   );
    //   expect(gasEstimate.minAmountOut).not.toBeNull();
    // });

    it("trades 2 USDC into WETH on Cowswap", async () => {
      await pool.trade(
        Dapp.COWSWAP,
        USDC,
        WETH,
        "2000000",
        0.5,
        await getTxOptions(network)
      );
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
  network: Network.POLYGON,
  testingRun: testCowswap,
  onFork: false
});
