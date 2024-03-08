/* eslint-disable @typescript-eslint/no-explicit-any */
import BigNumber from "bignumber.js";
import { Dhedge, Pool } from "../entities";
import { Network } from "../types";
import {
  TestingRunParams,
  setTokenAmount,
  testingHelper
} from "./utils/testingHelper";
import { Contract } from "ethers";
import { MAX_AMOUNT, TEST_POOL } from "./constants";
import { flatMoneyContractAddresses } from "../config";
import DelayedOrderAbi from "../abi/flatmoney/DelayedOrder.json";
import { allowanceDelta } from "./utils/token";

const fWETH = "";
const fWETH_SLOT = 0;

const testFlatMoney = ({ wallet, network, provider }: TestingRunParams) => {
  let dhedge: Dhedge;
  let pool: Pool;
  let delayOrderContract: Contract;
  jest.setTimeout(100000);
  describe(`flatmoney on ${network}`, () => {
    beforeAll(async () => {
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);

      const flatMoneyContracts = flatMoneyContractAddresses[pool.network];
      if (!flatMoneyContracts) {
        throw new Error("testFlatMoney: network not supported");
      }
      delayOrderContract = new Contract(
        flatMoneyContracts.DelayedOrder,
        DelayedOrderAbi,
        pool.signer
      );

      // top up gas
      await provider.send("hardhat_setBalance", [
        wallet.address,
        "0x10000000000000000"
      ]);
      await provider.send("evm_mine", []);

      await setTokenAmount({
        amount: new BigNumber(100).times(1e18).toString(),
        provider,
        tokenAddress: fWETH,
        slot: fWETH_SLOT,
        userAddress: wallet.address
      });
    });

    it("mint UNIT", async () => {
      //approve
      await pool.approveSpender(delayOrderContract.address, fWETH, MAX_AMOUNT);
      const collateralAllowanceDelta = await allowanceDelta(
        pool.address,
        fWETH,
        delayOrderContract.address,
        pool.signer
      );
      await expect(collateralAllowanceDelta.gt(0));

      const depositAmountStr = new BigNumber(1).times(1e18).toString();
      const tx = await pool.mintUnitViaFlatMoney(
        depositAmountStr,
        0.5,
        null,
        false
      );
      expect(tx).not.toBe(null);
      const existingOrder = await delayOrderContract.getAnnouncedOrder(
        pool.address
      );
      expect(existingOrder.orderType).toBe(1);
    });

    it("redeem UNIT", async () => {
      const withdrawAmountStr = new BigNumber(0.5).times(1e18).toString();
      const tx = await pool.redeemUnitViaFlatMoney(
        withdrawAmountStr,
        0.5,
        null,
        false
      );
      expect(tx).not.toBe(null);
      const existingOrder = await delayOrderContract.getAnnouncedOrder(
        pool.address
      );
      expect(existingOrder.orderType).toBe(2);
    });

    it("cancel order", async () => {
      const withdrawAmountStr = new BigNumber(0.1).times(1e18).toString();
      await pool.redeemUnitViaFlatMoney(withdrawAmountStr, 0.5, null, false);

      await pool.cancelOrderViaFlatMoney();
      const existingOrder = await delayOrderContract.getAnnouncedOrder(
        pool.address
      );
      expect(existingOrder.orderType).toBe(0);
    });
  });
};

testingHelper({
  network: Network.BASE,
  testingRun: testFlatMoney
});
