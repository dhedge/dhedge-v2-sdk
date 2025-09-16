/* eslint-disable @typescript-eslint/no-non-null-assertion */

import BigNumber from "bignumber.js";
import { Dhedge, Pool } from "..";
import { routerAddress } from "../config";

import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import {
  setChainlinkTimeout,
  setUSDCAmount,
  testingHelper,
  TestingRunParams
} from "./utils/testingHelper";

import { allowanceDelta, balanceDelta } from "./utils/token";

const testToros = ({ wallet, network, provider }: TestingRunParams) => {
  const USDC = CONTRACT_ADDRESS[network].USDC;
  const TOROS = CONTRACT_ADDRESS[network].TOROS;

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`pool on ${network}`, () => {
    beforeAll(async () => {
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);
      await setChainlinkTimeout({ pool, provider }, 86400 * 365);
      // top up gas
      await provider.send("hardhat_setBalance", [
        wallet.address,
        "0x10000000000000000"
      ]);
      await provider.send("evm_mine", []);
      // top up USDC
      const amount = new BigNumber(100).times(1e6).toFixed(0);
      await setUSDCAmount({
        amount,
        userAddress: pool.address,
        network,
        provider
      });
    });

    it("approves unlimited USDC on Toros", async () => {
      await pool.approve(Dapp.TOROS, USDC, MAX_AMOUNT);
      const usdcAllowanceDelta = await allowanceDelta(
        pool.address,
        USDC,
        routerAddress[network].toros!,
        pool.signer
      );
      await expect(usdcAllowanceDelta.gt(0));
    });

    it("trades USDC balance into Toros Token", async () => {
      const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
      await pool.trade(Dapp.TOROS, USDC, TOROS, usdcBalance, 1);
      const torosBalanceDelta = await balanceDelta(
        pool.address,
        TOROS,
        pool.signer
      );
      expect(torosBalanceDelta.gt(0));
    });

    it("init Toros Token for withdrawal", async () => {
      await provider.send("evm_increaseTime", [86400]);
      await provider.send("evm_mine", []);
      const torosBalance = await pool.utils.getBalance(TOROS, pool.address);
      await pool.approve(Dapp.TOROS, TOROS, MAX_AMOUNT);
      await pool.trade(Dapp.TOROS, TOROS, USDC, torosBalance, 1);
      const torosBalanceDelta = await balanceDelta(
        pool.address,
        TOROS,
        pool.signer
      );
      expect(torosBalanceDelta.lt(0));
    });

    it("complete withdrawal from Toros asset", async () => {
      await pool.completeTorosWithdrawal(USDC, 1);
      const usdcBalanceDelta = await balanceDelta(
        pool.address,
        USDC,
        pool.signer
      );
      expect(usdcBalanceDelta.gt(0));
    });
  });
};

testingHelper({
  network: Network.OPTIMISM,
  testingRun: testToros,
  onFork: true
});
