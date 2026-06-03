/* eslint-disable @typescript-eslint/no-non-null-assertion */

import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { Dhedge, Pool } from "..";
import { limitOrderAddress, routerAddress } from "../config";

import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import {
  fixOracleAggregatorStaleness,
  runWithImpersonateAccount,
  setChainlinkTimeout,
  setUSDCAmount,
  testingHelper,
  TestingRunParams
} from "./utils/testingHelper";

const TOROS_BTCBEAR2X = "0x3e63f81b3aa4e821392fccdabdd7d0c960c0235e";
const BTC_PRICING_ASSET = "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f"; // WBTC

const testTorosLimitOrder = ({
  wallet,
  network,
  provider
}: TestingRunParams) => {
  const ORDER_AMOUNT = ethers.utils.parseEther("0.001");
  const STOP_LOSS = ethers.utils.parseEther("50000");
  const TAKE_PROFIT = ethers.utils.parseEther("200000");

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`toros limit order on ${network}`, () => {
    beforeAll(async () => {
      // Top up gas
      await provider.send("hardhat_setBalance", [
        wallet.address,
        "0x10000000000000000"
      ]);
      await provider.send("evm_mine", []);

      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);

      await setChainlinkTimeout({ pool, provider }, 86400 * 365);
      await fixOracleAggregatorStaleness({ pool, provider });

      // Impersonate pool manager to set trader and enable BTCBEAR2X asset
      await runWithImpersonateAccount(
        { provider, account: await pool.managerLogic.manager() },
        async ({ signer }) => {
          await pool.managerLogic.connect(signer).setTrader(wallet.address);
          const USDC = CONTRACT_ADDRESS[network].USDC;
          const easySwapperV2 = routerAddress[network][Dapp.TOROS]!;
          await pool.managerLogic.connect(signer).changeAssets(
            [
              [TOROS_BTCBEAR2X, false],
              [USDC, true],
              [easySwapperV2, false]
            ],
            []
          );
        }
      );

      // Fund pool with USDC and trade into BTCBEAR2X
      const USDC = CONTRACT_ADDRESS[network].USDC;
      const usdcAmount = new BigNumber(100).times(1e6).toFixed(0);
      await setUSDCAmount({
        amount: usdcAmount,
        userAddress: pool.address,
        network,
        provider
      });
      await pool.approve(Dapp.TOROS, USDC, MAX_AMOUNT);
      await pool.trade(Dapp.TOROS, USDC, TOROS_BTCBEAR2X, usdcAmount, 1.5);
    });

    it("approves Toros vault token for LimitOrderManager", async () => {
      const tx = await pool.approveTorosLimitOrder(TOROS_BTCBEAR2X, MAX_AMOUNT);
      await tx.wait(1);
      const iERC20 = new ethers.Contract(
        TOROS_BTCBEAR2X,
        ["function allowance(address,address) view returns (uint256)"],
        pool.signer
      );
      const allowance = await iERC20.allowance(
        pool.address,
        limitOrderAddress[network]
      );
      expect(allowance.gt(0)).toBe(true);
    });

    it("creates a limit order", async () => {
      const tx = await pool.createTorosLimitOrder(
        TOROS_BTCBEAR2X,
        ORDER_AMOUNT,
        STOP_LOSS,
        TAKE_PROFIT,
        BTC_PRICING_ASSET
      );
      await tx.wait(1);
      const order = await pool.getTorosLimitOrder(
        pool.address,
        TOROS_BTCBEAR2X
      );
      expect(order).not.toBeNull();
      expect(order!.amount.eq(ORDER_AMOUNT)).toBe(true);
      expect(order!.stopLossPriceD18.eq(STOP_LOSS)).toBe(true);
      expect(order!.takeProfitPriceD18.eq(TAKE_PROFIT)).toBe(true);
      expect(order!.pool.toLowerCase()).toBe(TOROS_BTCBEAR2X.toLowerCase());
      expect(order!.pricingAsset.toLowerCase()).toBe(
        BTC_PRICING_ASSET.toLowerCase()
      );
    });

    it("modifies a toros limit order", async () => {
      const order = await pool.getTorosLimitOrder(
        pool.address,
        TOROS_BTCBEAR2X
      );
      if (!order) throw new Error("No existing order found");

      const newStopLoss = order.stopLossPriceD18
        .mul(90)
        .div(100)
        .toString();
      const newTakeProfit = order.takeProfitPriceD18
        .mul(110)
        .div(100)
        .toString();

      const tx = await pool.modifyTorosLimitOrder(
        TOROS_BTCBEAR2X,
        order.amount,
        newStopLoss,
        newTakeProfit,
        order.pricingAsset
      );
      await tx.wait(1);

      const modifiedOrder = await pool.getTorosLimitOrder(
        pool.address,
        TOROS_BTCBEAR2X
      );
      expect(modifiedOrder).not.toBeNull();
      expect(modifiedOrder!.stopLossPriceD18.toString()).toBe(newStopLoss);
      expect(modifiedOrder!.takeProfitPriceD18.toString()).toBe(newTakeProfit);
    });

    it("deletes a toros limit order", async () => {
      const order = await pool.getTorosLimitOrder(
        pool.address,
        TOROS_BTCBEAR2X
      );
      if (!order) throw new Error("No existing order found");

      const tx = await pool.deleteTorosLimitOrder(TOROS_BTCBEAR2X);
      await tx.wait(1);

      const deletedOrder = await pool.getTorosLimitOrder(
        pool.address,
        TOROS_BTCBEAR2X
      );
      expect(deletedOrder).toBeNull();
    });
  });
};

testingHelper({
  network: Network.ARBITRUM,
  testingRun: testTorosLimitOrder
});
