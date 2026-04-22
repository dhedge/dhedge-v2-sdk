/* eslint-disable @typescript-eslint/no-non-null-assertion */

import BigNumber from "bignumber.js";
import { Dhedge, ethers, Pool } from "..";

import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT } from "./constants";
import {
  fixOracleAggregatorStaleness,
  runWithImpersonateAccount,
  setChainlinkTimeout,
  setUSDCAmount,
  testingHelper,
  TestingRunParams
} from "./utils/testingHelper";
import { balanceDelta } from "./utils/token";
import { routerAddress } from "../config";

const testToros = ({ wallet, network, provider }: TestingRunParams) => {
  const USDC = CONTRACT_ADDRESS[network].USDC;
  const TOROS = CONTRACT_ADDRESS[network].TOROS;
  const TEST_POOL_ADDRESS = "0x2d4cddd2c4fa854536593bcf61d0da3b63ed80cb";

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`pool on ${network}`, () => {
    beforeAll(async () => {
      await provider.send("hardhat_setBalance", [
        wallet.address,
        "0x10000000000000000"
      ]);
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL_ADDRESS);

      await setChainlinkTimeout({ pool, provider }, 86400 * 365);
      await fixOracleAggregatorStaleness({ pool, provider });

      // Impersonate pool manager to set trader and add Toros token as asset
      await runWithImpersonateAccount(
        { provider, account: await pool.managerLogic.manager() },
        async ({ signer }) => {
          await pool.managerLogic.connect(signer).setTrader(wallet.address);
          const newAssets = [
            [USDC, true],
            [TOROS, false]
          ];
          await pool.managerLogic.connect(signer).changeAssets(newAssets, []);
        }
      );

      // Fix the Toros vault's oracle aggregators (has different assets with Pyth oracles)
      if (TOROS) {
        const torosPool = await dhedge.loadPool(TOROS);
        await fixOracleAggregatorStaleness({ pool: torosPool, provider });
      }

      // top up USDC
      const amount = new BigNumber(1000).times(1e6).toFixed(0);
      await setUSDCAmount({
        amount,
        userAddress: pool.address,
        network,
        provider
      });
    });

    it("approves unlimited USDC on Toros", async () => {
      await pool.approve(Dapp.TOROS, USDC, MAX_AMOUNT);
      const usdcAllowance = await new ethers.Contract(
        USDC,
        ["function allowance(address,address) view returns (uint256)"],
        pool.signer
      ).allowance(pool.address, routerAddress[network].toros!);
      expect(usdcAllowance.gt(0)).toBe(true);
    });

    it("trades USDC balance into Toros Token", async () => {
      const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
      await pool.trade(Dapp.TOROS, USDC, TOROS, usdcBalance, 1.5);
      const torosBalanceDelta = await balanceDelta(
        pool.address,
        TOROS,
        pool.signer
      );
      expect(torosBalanceDelta.gt(0)).toBe(true);
    });

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
        }
      );
      expect(completWithdrawResult.txData).toBeDefined();
    });

    it("init Toros Token for withdrawal", async () => {
      await provider.send("evm_increaseTime", [86400]);
      await provider.send("evm_mine", []);
      const torosBalance = await pool.utils.getBalance(TOROS, pool.address);
      await pool.approve(Dapp.TOROS, TOROS, MAX_AMOUNT);
      await pool.trade(Dapp.TOROS, TOROS, USDC, torosBalance, 1.5);
      const torosBalanceDelta = await balanceDelta(
        pool.address,
        TOROS,
        pool.signer
      );
      expect(torosBalanceDelta.lt(0)).toBe(true);
    });

    it("complete withdrawal from Toros asset", async () => {
      await new Promise(resolve => setTimeout(resolve, 5000)); // wait for Toros withdrawal to be ready
      await pool.completeTorosWithdrawal(USDC, 1.5);
      const usdcBalanceDelta = await balanceDelta(
        pool.address,
        USDC,
        pool.signer
      );
      expect(usdcBalanceDelta.gt(0)).toBe(true);
    });
  });
};

testingHelper({
  network: Network.ARBITRUM,
  testingRun: testToros,
  onFork: true
});
