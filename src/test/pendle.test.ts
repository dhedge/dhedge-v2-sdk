/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { Dhedge, Pool } from "..";

import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT } from "./constants";
import {
  TestingRunParams,
  setTokenAmount,
  setUSDCAmount,
  testingHelper,
  wait
} from "./utils/testingHelper";

import { getTxOptions } from "./txOptions";
import BigNumber from "bignumber.js";
import { balanceDelta } from "./utils/token";

const testPendle = ({ wallet, network, provider }: TestingRunParams) => {
  const USDC = CONTRACT_ADDRESS[network].USDC;
  const weETH = "0x35751007a407ca6feffe80b3cb397736d2cf4dbe";
  // const PTweETH = "0xb33808ea0e883138680ba29311a220a7377cdb92";
  const PTweETH_matured = "0xe2b2d203577c7cb3d043e89ccf90b5e24d19b66f";

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`pool on ${network}`, () => {
    beforeAll(async () => {
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(wallet.address, false);
      // top up gas
      await provider.send("hardhat_setBalance", [
        wallet.address,
        "0x10000000000000000"
      ]);
      await provider.send("evm_mine", []);
      // top up USDC
      await setUSDCAmount({
        amount: new BigNumber(2000).times(1e6).toFixed(0),
        userAddress: pool.address,
        network,
        provider
      });
      await pool.approve(Dapp.ODOS, USDC, MAX_AMOUNT);
      await pool.trade(
        Dapp.ODOS,
        USDC,
        weETH,
        "2000000000",
        0.5,
        await getTxOptions(network)
      );
    });

    // it("swaps weETH to PTweETH on Pendle", async () => {
    //   await pool.approve(Dapp.PENDLE, weETH, MAX_AMOUNT);
    //   const weEthBalance = await pool.utils.getBalance(weETH, pool.address);
    //   await pool.trade(
    //     Dapp.PENDLE,
    //     weETH,
    //     PTweETH,
    //     weEthBalance,
    //     0.5,
    //     await getTxOptions(network)
    //   );
    //   const ptWeEthBalanceDelta = await balanceDelta(
    //     pool.address,
    //     PTweETH,
    //     pool.signer
    //   );
    //   expect(ptWeEthBalanceDelta.gt(0));
    // });

    // it("swaps PTweETH to weETH on Pendle", async () => {
    //   await pool.approve(Dapp.PENDLE, PTweETH, MAX_AMOUNT);
    //   const PTweEthBalance = await pool.utils.getBalance(PTweETH, pool.address);
    //   console.log("PTweEthBalance", PTweEthBalance.toString());
    //   await wait(3);
    //   await pool.trade(
    //     Dapp.PENDLE,
    //     PTweETH,
    //     weETH,
    //     PTweEthBalance,
    //     0.5,
    //     await getTxOptions(network)
    //   );
    //   const weEthBalanceDelta = await balanceDelta(
    //     pool.address,
    //     weETH,
    //     pool.signer
    //   );
    //   expect(weEthBalanceDelta.gt(0));
    // });

    it("exit matured PTweETH to weETH on Pendle", async () => {
      await setTokenAmount({
        amount: new BigNumber(1).times(1e18).toString(),
        provider,
        tokenAddress: PTweETH_matured,
        slot: 0,
        userAddress: pool.address
      });
      await pool.approve(Dapp.PENDLE, PTweETH_matured, MAX_AMOUNT);
      const PTweEthBalance = await pool.utils.getBalance(
        PTweETH_matured,
        pool.address
      );
      await wait(3);
      await pool.trade(
        Dapp.PENDLE,
        PTweETH_matured,
        weETH,
        PTweEthBalance,
        0.5,
        await getTxOptions(network)
      );
      const weEthBalanceDelta = await balanceDelta(
        pool.address,
        weETH,
        pool.signer
      );
      expect(weEthBalanceDelta.eq(PTweEthBalance));
    });

    it("exit matured PTweETH to weETH on Pendle", async () => {
      await setTokenAmount({
        amount: new BigNumber(1).times(1e18).toString(),
        provider,
        tokenAddress: PTweETH_matured,
        slot: 0,
        userAddress: pool.address
      });
      await pool.approve(Dapp.PENDLE, PTweETH_matured, MAX_AMOUNT);
      const PTweEthBalance = await pool.utils.getBalance(
        PTweETH_matured,
        pool.address
      );
      await wait(3);
      const result = await pool.trade(
        Dapp.PENDLE,
        PTweETH_matured,
        weETH,
        PTweEthBalance,
        0.5,
        await getTxOptions(network),
        true
      );

      expect(result.gas).not.toBeNull();
      expect(result.minAmountOut).not.toBeNull();
      expect(result.gasEstimationError).toBeNull();
    });
  });
};

testingHelper({
  network: Network.ARBITRUM,
  testingRun: testPendle
});
