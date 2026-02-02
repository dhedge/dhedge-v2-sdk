/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { Dhedge, Pool } from "..";

import { Network } from "../types";
import { TEST_POOL } from "./constants";

import { TestingRunParams, testingHelper } from "./utils/testingHelper";

// import { balanceDelta } from "./utils/token";

const testHyperliquid = ({ wallet, network }: TestingRunParams) => {
  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`pool on ${network}`, () => {
    beforeAll(async () => {
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);
      // // top up gas
      // await provider.send("hardhat_setBalance", [
      //   wallet.address,
      //   "0x10000000000000000"
      // ]);
      // await provider.send("evm
      // _mine", []);
      // // top up USDC
      // await setUSDCAmount({
      //   amount: new BigNumber(2).times(1e6).toFixed(0),
      //   userAddress: pool.address,
      //   network,
      //   provider
      // });
    });

    // it("approves unlimited USDC on Hyperliquid Core Wallet", async () => {
    //   await pool.approve(
    //     Dapp.HYPERLIQUID,
    //     USDC,
    //     MAX_AMOUNT,
    //     await getTxOptions(network)
    //   );
    //   const usdcAllowanceDelta = await allowanceDelta(
    //     pool.address,
    //     USDC,
    //     routerAddress[network][Dapp.HYPERLIQUID]!,
    //     pool.signer
    //   );
    //   await expect(usdcAllowanceDelta.gt(0));
    // });

    // it("deposits USDC into Hyperliquid Core Wallet", async () => {
    //   await pool.depositHyperliquid(
    //     "30000000", // 5 USDC with 6 decimals,
    //     4294967295
    //   );
    //   expect(
    //     (await balanceDelta(pool.address, USDC, pool.signer)).eq("-20000000")
    //   ).toBe(true);
    // });

    // it("move 5 USDC from Perp to Spot Wallet", async () => {
    //   const tx = await pool.perpToSpotHyperliquid(
    //     "5000000" // 5 USDC with 6 decimals
    //   );
    //   expect(tx).toBeDefined();
    // });

    it("withdraws USDC from Hyperliquid Spot Wallet", async () => {
      const tx = await pool.withdrawHyperliquid(
        "5000000" // 5 USDC with 6 decimals
      );
      expect(tx).toBeDefined();
    });

    // it("sets up a BTC_USDC buy order", async () => {
    //   const tx = await pool.openMarketOrderHyperliquid(
    //     10107, // HYPE SPOT
    //     true, // is long
    //     25, // 25 USD value of BTC,
    //     1 // 0.5% slippage
    //   );
    //   expect(tx).toBeDefined();
    // });
  });
};

testingHelper({
  network: Network.HYPERLIQUID,
  testingRun: testHyperliquid,
  onFork: false
});
