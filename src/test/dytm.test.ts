/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import BigNumber from "bignumber.js";
import { Dhedge, Pool } from "..";
import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT } from "./constants";
import {
  TestingRunParams,
  setUSDCAmount,
  testingHelper
} from "./utils/testingHelper";
import { allowanceDelta, balanceDelta } from "./utils/token";
import { getWalletData } from "./wallet";
import { routerAddress } from "../config";

const testFluid = ({ network, provider }: TestingRunParams) => {
  const USDC = CONTRACT_ADDRESS[network].USDC;
  const USDC_DEPOSIT_TOKEN =
    "904625697166532776746648322844000357707437986793529882676722159659208562737";
  const USDC_BOORROW_TOKEN =
    "2463626077603766231593212976118459784597387237425";

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`[${network}] DYTM tests`, () => {
    beforeAll(async () => {
      const { wallet } = getWalletData(network);
      // top up ETH (gas)
      await provider.send("hardhat_setBalance", [
        wallet.address,
        "0x100000000000000"
      ]);
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(wallet.address, false);
      await setUSDCAmount({
        amount: new BigNumber(100 * 1e6).toFixed(0),
        userAddress: pool.address,
        network,
        provider
      });
    });

    it("approves unlimited USDC for DYTM", async () => {
      await pool.approve(Dapp.DYTM, USDC, MAX_AMOUNT);
      const usdcAllowanceDelta = await allowanceDelta(
        pool.address,
        USDC,
        routerAddress[network]["dytm"]!,
        pool.signer
      );
      await expect(usdcAllowanceDelta.gt(0));
    });

    it("estimate lends USDC to DYTM market", async () => {
      const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
      const result = await pool.lend(
        Dapp.DYTM,
        USDC_DEPOSIT_TOKEN,
        usdcBalance,
        0,
        null,
        true
      );

      expect(result.gas.gt(0));
    });

    it("lends USDC to DYTM market", async () => {
      const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
      await pool.lend(Dapp.DYTM, USDC_DEPOSIT_TOKEN, usdcBalance);

      const usdcTokenDelta = await balanceDelta(
        pool.address,
        USDC,
        pool.signer
      );
      expect(usdcTokenDelta.lt(0));
    });

    it("borrows USDC from DYTM market", async () => {
      await pool.borrow(Dapp.DYTM, USDC_BOORROW_TOKEN, (50 * 1e6).toString());

      const usdcTokenDelta = await balanceDelta(
        pool.address,
        USDC,
        pool.signer
      );
      expect(usdcTokenDelta.gt(0));
    });

    it("repays USDC to DYTM market", async () => {
      await pool.repay(Dapp.DYTM, USDC_BOORROW_TOKEN, (10 * 1e6).toString());

      const usdcTokenDelta = await balanceDelta(
        pool.address,
        USDC,
        pool.signer
      );
      expect(usdcTokenDelta.lt(0));
    });

    it("withdraws USDC from DYTM market", async () => {
      await pool.withdrawDeposit(
        Dapp.DYTM,
        USDC_DEPOSIT_TOKEN,
        (5 * 1e6).toString()
      );

      const usdcTokenDelta = await balanceDelta(
        pool.address,
        USDC,
        pool.signer
      );
      expect(usdcTokenDelta.gt(0));
    });
  });
};

testingHelper({
  network: Network.ARBITRUM,
  testingRun: testFluid
});
