/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { Dhedge, Pool } from "..";

import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT } from "./constants";
import { testingHelper, TestingRunParams } from "./utils/testingHelper";

const testToros = ({ wallet, network }: TestingRunParams) => {
  const USDC = CONTRACT_ADDRESS[network].USDC;
  const TOROS = CONTRACT_ADDRESS[network].TOROS;

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`pool on ${network}`, () => {
    beforeAll(async () => {
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(
        "0x0Ff1CEd6a4a330F0A294A0517933eb318e5CeA90",
        false
      );
      // await setChainlinkTimeout({ pool, provider }, 86400 * 365);
      // // top up gas
      // await provider.send("hardhat_setBalance", [
      //   wallet.address,
      //   "0x10000000000000000"
      // ]);
      // await provider.send("evm_mine", []);
      // // top up USDC
      // const amount = new BigNumber(100).times(1e6).toFixed(0);
      // await setUSDCAmount({
      //   amount,
      //   userAddress: pool.address,
      //   network,
      //   provider
      // });
    });

    // it("approves unlimited USDC on Toros", async () => {
    //   await pool.approve(Dapp.TOROS, USDC, MAX_AMOUNT);
    //   const usdcAllowanceDelta = await allowanceDelta(
    //     pool.address,
    //     USDC,
    //     routerAddress[network].toros!,
    //     pool.signer
    //   );
    //   await expect(usdcAllowanceDelta.gt(0));
    // });

    // it("trades USDC balance into Toros Token", async () => {
    //   const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
    //   await pool.trade(Dapp.TOROS, USDC, TOROS, usdcBalance, 1.5);
    //   const torosBalanceDelta = await balanceDelta(
    //     pool.address,
    //     TOROS,
    //     pool.signer
    //   );
    //   expect(torosBalanceDelta.gt(0));
    // });

    it("get Tx data for init and complete withdrawal", async () => {
      // await provider.send("evm_increaseTime", [86400]);
      // await provider.send("evm_mine", []);
      const torosBalance = await pool.utils.getBalance(TOROS, pool.address);
      await pool.approve(Dapp.TOROS, TOROS, MAX_AMOUNT);
      const tradeResult = await pool.trade(
        Dapp.TOROS,
        TOROS,
        USDC,
        torosBalance,
        1.5,
        null,
        {
          estimateGas: false,
          onlyGetTxData: true
        }
      );
      expect(tradeResult.minAmountOut).toBeDefined();
      const completWithdrawResult = await pool.completeTorosWithdrawal(
        USDC,
        5,
        null,
        {
          estimateGas: false,
          onlyGetTxData: true
        },
        tradeResult.minAmountOut
      );
      expect(completWithdrawResult.txData).toBeDefined();
    });

    // it("init Toros Token for withdrawal", async () => {
    //   // await provider.send("evm_increaseTime", [86400]);
    //   // await provider.send("evm_mine", []);
    //   const torosBalance = await pool.utils.getBalance(TOROS, pool.address);
    //   await pool.approve(Dapp.TOROS, TOROS, MAX_AMOUNT);
    //   await pool.trade(Dapp.TOROS, TOROS, USDC, torosBalance, 1.5);
    //   const torosBalanceDelta = await balanceDelta(
    //     pool.address,
    //     TOROS,
    //     pool.signer
    //   );
    //   expect(torosBalanceDelta.lt(0));
    // });

    // it("complete withdrawal from Toros asset", async () => {
    //   await pool.completeTorosWithdrawal(USDC, 5);
    //   const usdcBalanceDelta = await balanceDelta(
    //     pool.address,
    //     USDC,
    //     pool.signer
    //   );
    //   expect(usdcBalanceDelta.gt(0));
    // });
  });
};

testingHelper({
  network: Network.ARBITRUM,
  testingRun: testToros,
  onFork: true
});
