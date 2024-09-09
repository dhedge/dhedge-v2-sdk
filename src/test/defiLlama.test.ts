/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { Dhedge, Pool } from "..";

import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import {
  TestingRunParams,
  setUSDCAmount,
  testingHelper
} from "./utils/testingHelper";
import BigNumber from "bignumber.js";
import { balanceDelta } from "./utils/token";

import { getTxOptions } from "./txOptions";

const testDefiLlama = ({ wallet, network, provider }: TestingRunParams) => {
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
        amount: new BigNumber(10).times(1e6).toFixed(0),
        userAddress: pool.address,
        network,
        provider
      });
      await pool.approve(Dapp.ONEINCH, USDC, MAX_AMOUNT);
      await pool.approve(Dapp.ZEROEX, USDC, MAX_AMOUNT);
    });

    it("trades 2 USDC into WETH on 0x", async () => {
      await pool.tradeDefiLlama(
        Dapp.ZEROEX,
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

    it("trades 2 USDC into WETH on 1inch", async () => {
      await pool.tradeDefiLlama(
        Dapp.ONEINCH,
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

    it("trades 2 USDC into WETH protocol with best price", async () => {
      await pool.tradeDefiLlama(
        null,
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
  testingRun: testDefiLlama
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
