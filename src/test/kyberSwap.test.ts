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
import { routerAddress } from "../config";
import BigNumber from "bignumber.js";

const testKyberSwap = ({ wallet, network, provider }: TestingRunParams) => {
  const USDC = CONTRACT_ADDRESS[network].USDC;
  const WETH = CONTRACT_ADDRESS[network].WETH;

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`kyberswap on ${network}`, () => {
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

    it("approves unlimited USDC on KyberSwap", async () => {
      await pool.approve(Dapp.KYBERSWAP, USDC, MAX_AMOUNT);
      const usdcAllowanceDelta = await allowanceDelta(
        pool.address,
        USDC,
        routerAddress[network]["kyberswap"]!,
        pool.signer
      );
      await expect(usdcAllowanceDelta.gt(0));
    });

    it("gets only amount and txData for 2 USDC into WETH on KyberSwap", async () => {
      const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
      const result = await pool.trade(
        Dapp.KYBERSWAP,
        USDC,
        WETH,
        usdcBalance,
        1,
        null,
        { estimateGas: false, onlyGetTxData: true }
      );
      expect(result.txData).not.toBeNull();
      expect(result.minAmountOut).not.toBeNull();
    });

    it("trades USDC balance into WETH on KyberSwap", async () => {
      await wait(1);
      const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
      await pool.trade(Dapp.KYBERSWAP, USDC, WETH, usdcBalance, 1);
      const wethBalanceDelta = await balanceDelta(
        pool.address,
        WETH,
        pool.signer
      );
      expect(wethBalanceDelta.gt(0));
    });
  });
};

// testingHelper({
//   network: Network.PLASMA,
//   onFork: false,
//   testingRun: testKyberSwap
// });

testingHelper({
  network: Network.ARBITRUM,
  testingRun: testKyberSwap
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
