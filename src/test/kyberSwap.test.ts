/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { Dhedge, Pool } from "..";

import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import { TestingRunParams, testingHelper, wait } from "./utils/testingHelper";

import { allowanceDelta, balanceDelta } from "./utils/token";
import { routerAddress } from "../config";

const testKyberSwap = ({ wallet, network }: TestingRunParams) => {
  const USDT = CONTRACT_ADDRESS[network].USDT;
  const USDE = CONTRACT_ADDRESS[network].USDE;

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`kyberswap on ${network}`, () => {
    beforeAll(async () => {
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);
      // top up gas
      // await provider.send("hardhat_setBalance", [
      //   wallet.address,
      //   "0x10000000000000000"
      // ]);
      // await provider.send("evm_mine", []);
      // // top up USDC
      // await setUSDCAmount({
      //   amount: new BigNumber(2).times(1e6).toFixed(0),
      //   userAddress: pool.address,
      //   network,
      //   provider
      // });
    });

    it("approves unlimited USDT on KyberSwap", async () => {
      await pool.approve(Dapp.KYBERSWAP, USDT, MAX_AMOUNT);
      const usdtAllowanceDelta = await allowanceDelta(
        pool.address,
        USDT,
        routerAddress[network]["kyberswap"]!,
        pool.signer
      );
      await expect(usdtAllowanceDelta.gt(0));
    });

    it("gets only amount and txData for 2 USDT into WETH on KyberSwap", async () => {
      const usdtBalance = await pool.utils.getBalance(USDT, pool.address);
      const result = await pool.trade(
        Dapp.KYBERSWAP,
        USDT,
        USDE,
        usdtBalance,
        1,
        null,
        { estimateGas: false, onlyGetTxData: true }
      );
      expect(result.txData).not.toBeNull();
      expect(result.minAmountOut).not.toBeNull();
    });

    it("trades USDT balance into USDE on KyberSwap", async () => {
      await wait(1);
      const usdtBalance = await pool.utils.getBalance(USDT, pool.address);
      await pool.trade(Dapp.KYBERSWAP, USDT, USDE, usdtBalance, 1);
      const usdeBalanceDelta = await balanceDelta(
        pool.address,
        USDE,
        pool.signer
      );
      expect(usdeBalanceDelta.gt(0));
    });
  });
};

testingHelper({
  network: Network.PLASMA,
  onFork: false,
  testingRun: testKyberSwap
});

// testingHelper({
//   network: Network.ARBITRUM,
//   testingRun: testOdos
// });

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
