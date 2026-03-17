/* eslint-disable @typescript-eslint/no-non-null-assertion */

// import { ethers } from "ethers";
import { Dhedge, Pool } from "..";
// import { limitOrderAddress } from "../config";

import { Network } from "../types";
// import { MAX_AMOUNT } from "./constants";
import { testingHelper, TestingRunParams } from "./utils/testingHelper";

// import { allowanceDelta } from "./utils/token";

// cspell:ignore goldbull
const TOROS_GOLDBULL2X = "0xc8e7e840ca82804c14061a27aaca1b97a5a592ab";
// const GOLD_PRICING_ASSET = "0x7624cccCc59361D583F28BEC40D37e7771d2ef5D";

const testTorosLimitOrder = ({ wallet, network }: TestingRunParams) => {
  // const ORDER_AMOUNT = ethers.utils.parseEther("0.001");
  // const STOP_LOSS = ethers.utils.parseEther("3000");
  // const TAKE_PROFIT = ethers.utils.parseEther("6000");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`toros limit order on ${network}`, () => {
    beforeAll(async () => {
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(
        "0xdd3d575fae102a12aaa086d97c7a8814eff42ebc"
      );
    });

    // it("approves Toros vault token for LimitOrderManager", async () => {
    //   const tx = await pool.approveTorosLimitOrder(
    //     TOROS_GOLDBULL2X,
    //     MAX_AMOUNT
    //   );
    //   await tx.wait(1);
    //   const delta = await allowanceDelta(
    //     pool.address,
    //     TOROS_GOLDBULL2X,
    //     limitOrderAddress[network],
    //     pool.signer
    //   );
    //   expect(delta.gt(0)).toBe(true);
    // });

    // it("creates a limit order", async () => {
    //   const tx = await pool.createTorosLimitOrder(
    //     TOROS_GOLDBULL2X,
    //     ORDER_AMOUNT,
    //     STOP_LOSS,
    //     TAKE_PROFIT,
    //     GOLD_PRICING_ASSET
    //   );
    //   await tx.wait(1);
    //   const order = await pool.getTorosLimitOrder(
    //     pool.address,
    //     TOROS_GOLDBULL2X
    //   );
    //   expect(order).not.toBeNull();
    //   expect(order!.amount.eq(ORDER_AMOUNT)).toBe(true);
    //   expect(order!.stopLossPriceD18.eq(STOP_LOSS)).toBe(true);
    //   expect(order!.takeProfitPriceD18.eq(TAKE_PROFIT)).toBe(true);
    //   expect(order!.pool.toLowerCase()).toBe(TOROS_GOLDBULL2X.toLowerCase());
    //   expect(order!.pricingAsset.toLowerCase()).toBe(
    //     GOLD_PRICING_ASSET.toLowerCase()
    //   );
    // });

    // it("modifies a toros limit order", async () => {
    //   const order = await pool.getTorosLimitOrder(
    //     pool.address,
    //     TOROS_GOLDBULL2X
    //   );
    //   if (!order) throw new Error("No existing order found");

    //   const newStopLoss = order.stopLossPriceD18
    //     .mul(90)
    //     .div(100)
    //     .toString();
    //   const newTakeProfit = order.takeProfitPriceD18
    //     .mul(110)
    //     .div(100)
    //     .toString();

    //   const tx = await pool.modifyTorosLimitOrder(
    //     TOROS_GOLDBULL2X,
    //     order.amount,
    //     newStopLoss,
    //     newTakeProfit,
    //     order.pricingAsset
    //   );
    //   await tx.wait(1);

    //   const modifiedOrder = await pool.getTorosLimitOrder(
    //     pool.address,
    //     TOROS_GOLDBULL2X
    //   );
    //   expect(modifiedOrder).not.toBeNull();
    //   expect(modifiedOrder!.stopLossPriceD18.toString()).toBe(newStopLoss);
    //   expect(modifiedOrder!.takeProfitPriceD18.toString()).toBe(newTakeProfit);
    // });

    it("deletes a toros limit order", async () => {
      const order = await pool.getTorosLimitOrder(
        pool.address,
        TOROS_GOLDBULL2X
      );
      if (!order) throw new Error("No existing order found");

      const tx = await pool.deleteTorosLimitOrder(TOROS_GOLDBULL2X);
      await tx.wait(1);

      const deletedOrder = await pool.getTorosLimitOrder(
        pool.address,
        TOROS_GOLDBULL2X
      );
      expect(deletedOrder).toBeNull();
    });
  });
};

testingHelper({
  network: Network.ARBITRUM,
  testingRun: testTorosLimitOrder,
  onFork: false
});
