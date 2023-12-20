/* eslint-disable @typescript-eslint/no-non-null-assertion */
import BigNumber from "bignumber.js";
import { Dhedge, Pool } from "..";
import { routerAddress } from "../config";
import { Dapp, Network } from "../types";
import {
  CONTRACT_ADDRESS,
  MAX_AMOUNT,
  NATIVE_ETH_1INCH,
  TEST_POOL
} from "./constants";
import { TestingRunParams, testingHelper } from "./utils/testingHelper";
import { allowanceDelta, balanceDelta } from "./utils/token";

const testZeroEx = ({ wallet, network, provider }: TestingRunParams) => {
  const USDC = CONTRACT_ADDRESS[network].USDC;
  const WETH = CONTRACT_ADDRESS[network].WETH;

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`[${network}] 0x trade`, () => {
    beforeAll(async () => {
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);
      // top up ETH (gas)
      await provider.send("hardhat_setBalance", [
        wallet.address,
        "0x100000000000000"
      ]);
    });

    it("trade ETH into USDC", async () => {
      await pool.trade(
        Dapp.ZEROEX,
        NATIVE_ETH_1INCH,
        USDC,
        new BigNumber(1).times(1e18).toFixed(0),
        0.5
      );
      const usdcBalanceDelta = await balanceDelta(
        pool.address,
        USDC,
        pool.signer
      );
      expect(usdcBalanceDelta.gt(0));
    });

    it("approves unlimited USDC on 0x", async () => {
      await pool.approve(Dapp.ZEROEX, USDC, MAX_AMOUNT);
      const usdcAllowanceDelta = await allowanceDelta(
        pool.address,
        USDC,
        routerAddress[network]["0x"]!,
        pool.signer
      );
      await expect(usdcAllowanceDelta.gt(0));
    });

    it("trades 2 USDC into WETH on 0x", async () => {
      await pool.trade(Dapp.ZEROEX, USDC, WETH, "2000000", 0.5);
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
  testingRun: testZeroEx
});

testingHelper({
  network: Network.POLYGON,
  testingRun: testZeroEx
});

testingHelper({
  network: Network.BASE,
  testingRun: testZeroEx
});
