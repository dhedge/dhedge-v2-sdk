/* eslint-disable @typescript-eslint/no-explicit-any */
import BigNumber from "bignumber.js";
import { Dhedge, Pool } from "../entities";
import { AssetEnabled, Network } from "../types";
import {
  TestingRunParams,
  runWithImpersonateAccount,
  setTokenAmount,
  testingHelper
} from "./utils/testingHelper";
import { Contract, ethers } from "ethers";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import { flatMoneyContractAddresses } from "../config";
import DelayedOrderAbi from "../abi/flatmoney/DelayedOrder.json";
import { allowanceDelta } from "./utils/token";
import { getKeeperFee } from "../services/flatmoney/keeperFee";

const COLLATERAL_SLOT = 0; // same for RETH(base) and WBTC(optimism)
// https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/master/contracts/token/ERC20/ERC20Upgradeable.sol#L31
// https://eips.ethereum.org/EIPS/eip-7201
const UNIT_SLOT =
  "0x52c63247e1f47db19d5ce0460030c497f067ca4cebf71ba98eeadabe20bace00";

const testFlatMoney = ({
  wallet,
  network,
  provider,
  rpcUrl
}: TestingRunParams) => {
  let dhedge: Dhedge;
  let pool: Pool;
  let delayOrderContract: Contract;
  let COLLATERAL: string;
  jest.setTimeout(200000);
  describe(`flatmoney on ${network}`, () => {
    beforeAll(async () => {
      await provider.send("evm_mine", []);
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);

      await runWithImpersonateAccount(
        { provider, account: await pool.managerLogic.manager() },
        async ({ signer }) => {
          await pool.managerLogic.connect(signer).setTrader(wallet.address);
        }
      );

      const flatMoneyContracts = flatMoneyContractAddresses[pool.network];
      if (!flatMoneyContracts) {
        throw new Error("testFlatMoney: network not supported");
      }
      COLLATERAL = flatMoneyContracts.COLLATERAL;
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
        tokenAddress: COLLATERAL,
        slot: COLLATERAL_SLOT,
        userAddress: pool.address
      });
      await setTokenAmount({
        amount: new BigNumber(100).times(1e18).toString(),
        provider,
        tokenAddress: CONTRACT_ADDRESS[network].UNIT,
        slot: UNIT_SLOT,
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
          asset: CONTRACT_ADDRESS[network].UNIT,
          isDeposit: false
        },
        {
          asset: COLLATERAL,
          isDeposit: false
        }
      ];
      await pool.changeAssets(newAssets);
    });

    it("mint UNIT", async () => {
      //approve
      await pool.approveSpender(
        delayOrderContract.address,
        COLLATERAL,
        MAX_AMOUNT
      );
      const collateralAllowanceDelta = await allowanceDelta(
        pool.address,
        COLLATERAL,
        delayOrderContract.address,
        pool.signer
      );
      await expect(collateralAllowanceDelta.gt(0));

      const depositAmountStr = new BigNumber(1).times(1e18).toString();
      const estimateData = await pool.mintUnitViaFlatMoney(
        depositAmountStr,
        0.5,
        10, // set higher to tolerate high gasPrice returned by forked local chain
        null,
        true
      );
      expect(estimateData.gasEstimationError).toBe(null);
      const tx = await pool.mintUnitViaFlatMoney(
        depositAmountStr,
        0.5,
        10, // set higher to tolerate high gasPrice returned by forked local chain
        null,
        false
      );
      expect(tx).not.toBe(null);
      const existingOrder = await delayOrderContract.getAnnouncedOrder(
        pool.address
      );
      expect(existingOrder.orderType).toBe(1);
    });

    it("cancel order(estimate)", async () => {
      await provider.send("evm_increaseTime", [60 * 2]); // more than 1 min
      const res = await pool.cancelOrderViaFlatMoney({}, true);
      expect(res.gasEstimationError).toBe(null);
    });

    it("cancel order", async () => {
      await provider.send("evm_increaseTime", [60 * 2]); // more than 1 min
      await pool.cancelOrderViaFlatMoney();
      const existingOrder = await delayOrderContract.getAnnouncedOrder(
        pool.address
      );
      expect(existingOrder.orderType).toBe(0);
    });

    it("redeem UNIT", async () => {
      let withdrawAmountStr;
      if (Network.OPTIMISM === network) {
        withdrawAmountStr = new BigNumber(2).times(1e8).toString(); // smaller amount
      } else {
        withdrawAmountStr = new BigNumber(2).times(1e18).toString();
      }
      const estimateData = await pool.redeemUnitViaFlatMoney(
        withdrawAmountStr,
        0.5,
        10, //  set higher to tolerate high gasPrice returned by forked local chain
        null,
        true
      );
      expect(estimateData.gasEstimationError).toBe(null);

      const tx = await pool.redeemUnitViaFlatMoney(
        withdrawAmountStr,
        0.5,
        10, //  set higher to tolerate high gasPrice returned by forked local chain
        null,
        false
      );
      expect(tx).not.toBe(null);
      const existingOrder = await delayOrderContract.getAnnouncedOrder(
        pool.address
      );
      expect(existingOrder.orderType).toBe(2);

      await provider.send("evm_increaseTime", [60 * 2]); // more than 1 min
      await pool.cancelOrderViaFlatMoney();
    });

    it("keeperFee is small", async () => {
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      const walletOnChain = wallet.connect(provider);
      const dhedge = new Dhedge(walletOnChain, network);
      const pool = await dhedge.loadPool(TEST_POOL[network]);
      const keeperFee = await getKeeperFee(pool, 3);
      expect(keeperFee).toBeTruthy();
    });
  });
};

testingHelper({
  network: Network.BASE,
  testingRun: testFlatMoney
});
