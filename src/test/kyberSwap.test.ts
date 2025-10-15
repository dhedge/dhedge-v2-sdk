/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { Dhedge, Pool } from "..";

import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT } from "./constants";
import {
  TestingRunParams,
  setUSDCAmount,
  testingHelper,
  wait
} from "./utils/testingHelper";

import BigNumber from "bignumber.js";
import { allowanceDelta, balanceDelta } from "./utils/token";
import { routerAddress } from "../config";
import { getTxOptions } from "./txOptions";

const testKyberSwap = ({ wallet, network, provider }: TestingRunParams) => {
  const USDC = CONTRACT_ADDRESS[network].USDC;
  const WETH = CONTRACT_ADDRESS[network].WETH;

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`pool on ${network}`, () => {
    beforeAll(async () => {
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(dhedge.signer.address, false);
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
      const result = await pool.trade(
        Dapp.KYBERSWAP,
        USDC,
        WETH,
        "2000000",
        1,
        await getTxOptions(network),
        { estimateGas: false, onlyGetTxData: true }
      );
      expect(result.txData).not.toBeNull();
      expect(result.minAmountOut).not.toBeNull();
    });

    it("trades 2 USDC into WETH on KyberSwap", async () => {
      await wait(1);
      await pool.trade(
        Dapp.KYBERSWAP,
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
