/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { Dhedge, Pool } from "..";

import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import {
  TestingRunParams,
  setUSDCAmount,
  testingHelper,
  wait
} from "./utils/testingHelper";
import { allowanceDelta, balanceDelta } from "./utils/token";
import { getTxOptions } from "./txOptions";
import BigNumber from "bignumber.js";
import { OdosSwapFeeRecipient, routerAddress } from "../config";

const testOdos = ({ wallet, network, provider }: TestingRunParams) => {
  const USDC = CONTRACT_ADDRESS[network].USDC;
  const WETH = CONTRACT_ADDRESS[network].WETH;

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`pool on ${network}`, () => {
    beforeAll(async () => {
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);
      // top up gas
      await provider.send("hardhat_setBalance", [
        wallet.address,
        "0x10000000000000000"
      ]);
      await provider.send("evm_mine", []);
      // top up USDC
      await setUSDCAmount({
        amount: new BigNumber(20).times(1e6).toFixed(0),
        userAddress: pool.address,
        network,
        provider
      });
    });

    it("approves unlimited USDC on Odos", async () => {
      await pool.approve(Dapp.ODOS, USDC, MAX_AMOUNT);
      const usdcAllowanceDelta = await allowanceDelta(
        pool.address,
        USDC,
        routerAddress[network]["odos"]!,
        pool.signer
      );
      await expect(usdcAllowanceDelta.gt(0));
    });

    it("gets gas estimation for 10 USDC into WETH on Odos", async () => {
      const gasEstimate = await pool.trade(
        Dapp.ODOS,
        USDC,
        WETH,
        "10000000",
        1,
        await getTxOptions(network),
        true
      );
      expect(gasEstimate.gas.gt(0));
      expect(gasEstimate.minAmountOut).not.toBeNull();
    });

    it("trades 10 USDC into WETH on Odos", async () => {
      await wait(1);
      await pool.trade(
        Dapp.ODOS,
        USDC,
        WETH,
        "10000000",
        0.5,
        await getTxOptions(network)
      );
      const wethBalanceDelta = await balanceDelta(
        pool.address,
        WETH,
        pool.signer
      );
      expect(wethBalanceDelta.gt(0));
      const wethBalanceDeltaForFeeRecipient = await balanceDelta(
        OdosSwapFeeRecipient[network],
        WETH,
        pool.signer
      );

      // diffRatio  = (1 - fee) / (0.8 * fee)
      // 0.8 is the split percentage for fee recipient
      // e.g. for 0.02% fee, diffRatio = 0.9998 / 0.00016 = 6248.75
      // e.g. for 0.03% fee, diffRatio = 0.9997 / 0.00024 = 4165.42
      // e.g. for 0.04% fee, diffRatio = 0.9996 / 0.00032 = 3123.75
      // e.g. for 0.05% fee, diffRatio = 0.9995 / 0.00040 = 2498.75
      const diffRatio = wethBalanceDelta.div(wethBalanceDeltaForFeeRecipient);
      console.log("diff ratio:", diffRatio.toString());
      expect(diffRatio.gt(6200)).toBe(true);
      expect(diffRatio.lt(6260)).toBe(true);
      const wethBalanceDeltaForRouter = await balanceDelta(
        routerAddress[network]["odos"]!,
        WETH,
        pool.signer
      );
      // diffRatio  = (1 - fee) / (0.2 * fee)
      // 0.2 is the split percentage for router
      // e.g. for 0.02% fee, diffRatio = 0.9998 / 0.00004 = 24995
      // e.g. for 0.03% fee, diffRatio = 0.9997 / 0.00006 = 16661.67
      // e.g. for 0.04% fee, diffRatio = 0.9996 / 0.00008 = 12495
      // e.g. for 0.05% fee, diffRatio = 0.9995 / 0.00010 = 9995
      const diffRatioRouter = wethBalanceDelta.div(wethBalanceDeltaForRouter);
      console.log("diff ratio router:", diffRatioRouter.toString());
      expect(diffRatioRouter.gt(24000)).toBe(true);
      expect(diffRatioRouter.lt(26000)).toBe(true);
    });
  });
};

// testingHelper({
//   network: Network.OPTIMISM,
//   testingRun: testOdos
// });

testingHelper({
  network: Network.ARBITRUM,
  testingRun: testOdos
});

// testingHelper({
//   network: Network.POLYGON,
//   onFork: false,
//   testingRun: testOdos
// });

// testingHelper({
//   network: Network.BASE,
//   onFork: false,
//   testingRun: testOdos
// });
