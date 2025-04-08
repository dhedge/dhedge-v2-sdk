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
import { routerAddress } from "../config";

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
        amount: new BigNumber(2).times(1e6).toFixed(0),
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
        routerAddress[network]["1inch"]!,
        pool.signer
      );
      await expect(usdcAllowanceDelta.gt(0));
    });

    it("gets gas estimation for 2 USDC into WETH on Odos", async () => {
      const gasEstimate = await pool.trade(
        Dapp.ODOS,
        USDC,
        WETH,
        "2000000",
        1,
        await getTxOptions(network),
        true
      );
      expect(gasEstimate.gt(0));
    });

    it("trades 2 USDC into WETH on Odos", async () => {
      await wait(1);
      await pool.trade(
        Dapp.ODOS,
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
      expect(wethBalanceDelta.gt(0));
    });
  });
};

testingHelper({
  network: Network.OPTIMISM,
  testingRun: testOdos
});

// testingHelper({
//   network: Network.POLYGON,
//   onFork: false,
//   testingRun: testOneInch
// });

// testingHelper({
//   network: Network.BASE,
//   onFork: false,
//   testingRun: testOneInch
// });
