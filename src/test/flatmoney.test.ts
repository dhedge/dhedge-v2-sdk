/* eslint-disable @typescript-eslint/no-explicit-any */
import BigNumber from "bignumber.js";
import { Dhedge, Pool } from "../entities";
import { AssetEnabled, Network } from "../types";
import {
  TestingRunParams,
  setTokenAmount,
  testingHelper
} from "./utils/testingHelper";
import { Contract } from "ethers";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import { flatMoneyContractAddresses } from "../config";
import DelayedOrderAbi from "../abi/flatmoney/DelayedOrder.json";
import { allowanceDelta } from "./utils/token";

const RETH = "0xb6fe221fe9eef5aba221c348ba20a1bf5e73624c";
const RETH_SLOT = 0;
const UNIT = "0xb95fB324b8A2fAF8ec4f76e3dF46C718402736e2";

const testFlatMoney = ({ wallet, network, provider }: TestingRunParams) => {
  let dhedge: Dhedge;
  let pool: Pool;
  let delayOrderContract: Contract;
  jest.setTimeout(200000);
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
        tokenAddress: RETH,
        slot: RETH_SLOT,
        userAddress: pool.address
      });

      const currentAssets: any[] = await pool.managerLogic.getSupportedAssets();
      const exisitingAssets = currentAssets.map(item => {
        return {
          asset: item[0],
          isDeposit: item[1]
        };
      });

      const newAssets: AssetEnabled[] = [
        ...exisitingAssets,
        { asset: CONTRACT_ADDRESS[network].USDC, isDeposit: true },
        { asset: CONTRACT_ADDRESS[network].WETH, isDeposit: true },
        {
          asset: UNIT,
          isDeposit: false
        },
        {
          asset: RETH,
          isDeposit: false
        }
      ];
      await pool.changeAssets(newAssets);
    });

    it("mint UNIT", async () => {
      //approve
      await pool.approveSpender(delayOrderContract.address, RETH, MAX_AMOUNT);
      const collateralAllowanceDelta = await allowanceDelta(
        pool.address,
        RETH,
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

    it("cancel order", async () => {
      await provider.send("evm_increaseTime", [60 * 2]); // 1 min
      await pool.cancelOrderViaFlatMoney();
      const existingOrder = await delayOrderContract.getAnnouncedOrder(
        pool.address
      );
      expect(existingOrder.orderType).toBe(0);
    });

    it("redeem UNIT", async () => {
      const withdrawAmountStr = new BigNumber(0.00145).times(1e18).toString();
      const tx = await pool.redeemUnitViaFlatMoney(
        withdrawAmountStr,
        1,
        null,
        false
      );
      expect(tx).not.toBe(null);
      const existingOrder = await delayOrderContract.getAnnouncedOrder(
        pool.address
      );
      expect(existingOrder.orderType).toBe(2);
    });
  });
};

testingHelper({
  network: Network.BASE,
  testingRun: testFlatMoney
});
