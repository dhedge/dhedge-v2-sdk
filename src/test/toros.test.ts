/* eslint-disable @typescript-eslint/no-non-null-assertion */

import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { Dhedge, Pool } from "..";

import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT } from "./constants";
import {
  fixOracleAggregatorStaleness,
  setChainlinkTimeout,
  setUSDCAmount,
  testingHelper,
  TestingRunParams
} from "./utils/testingHelper";
import { allowanceDelta, balanceDelta } from "./utils/token";
import { routerAddress } from "../config";
import PoolLogic from "../abi/PoolLogic.json";
import PoolManagerLogic from "../abi/PoolManagerLogic.json";

const testToros = ({ network, provider }: TestingRunParams) => {
  const USDC = CONTRACT_ADDRESS[network].USDC;
  const TOROS = CONTRACT_ADDRESS[network].TOROS;

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`pool on ${network}`, () => {
    beforeAll(async () => {
      const poolAddress = "0x2d4cddd2c4fa854536593bcf61d0da3b63ed80cb";

      // Get the pool's manager address directly from the contracts
      const poolLogic = new ethers.Contract(
        poolAddress,
        PoolLogic.abi,
        provider
      );
      const managerLogicAddress: string = await poolLogic.poolManagerLogic();
      const managerLogic = new ethers.Contract(
        managerLogicAddress,
        PoolManagerLogic.abi,
        provider
      );
      const managerAddress: string = await managerLogic.manager();

      // Impersonate the pool's manager and fund with ETH for gas
      await provider.send("hardhat_impersonateAccount", [managerAddress]);
      await provider.send("hardhat_setBalance", [
        managerAddress,
        ethers.utils.hexValue(ethers.utils.parseEther("100"))
      ]);

      // Load pool with the impersonated manager signer
      const managerSigner = provider.getSigner(managerAddress);
      dhedge = new Dhedge((managerSigner as unknown) as ethers.Wallet, network);
      pool = await dhedge.loadPool(poolAddress, false);

      await setChainlinkTimeout({ pool, provider }, 86400 * 365);
      await fixOracleAggregatorStaleness({ pool, provider });

      // Also fix the Toros vault's aggregators (in case it has different assets)
      const torosPool = await dhedge.loadPool(TOROS);
      await fixOracleAggregatorStaleness({ pool: torosPool, provider });

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
      await pool.trade(Dapp.TOROS, USDC, TOROS, usdcBalance, 1.5);
      const torosBalanceDelta = await balanceDelta(
        pool.address,
        TOROS,
        pool.signer
      );
      expect(torosBalanceDelta.gt(0));
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
      expect(torosBalanceDelta.lt(0));
    });

    it("complete withdrawal from Toros asset", async () => {
      await pool.completeTorosWithdrawal(USDC, 5);
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
  network: Network.ARBITRUM,
  testingRun: testToros,
  onFork: true
});
