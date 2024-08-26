/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import BigNumber from "bignumber.js";
import { Dhedge, Pool } from "..";
import { AssetEnabled, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import {
  TestingRunParams,
  beforeAfterReset,
  setWETHAmount,
  testingHelper
} from "./utils/testingHelper";
import { allowanceDelta, balanceDelta } from "./utils/token";
import { getWalletData } from "./wallet";

const testCompoundV3 = ({ network, provider }: TestingRunParams) => {
  const WETH = CONTRACT_ADDRESS[network].WETH;
  const COMPOUNDV3_WETH = CONTRACT_ADDRESS[network].COMPOUNDV3_WETH;

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`[${network}] compound V3 tests`, () => {
    beforeAll(async () => {
      const { wallet } = getWalletData(network);
      // top up ETH (gas)
      await provider.send("hardhat_setBalance", [
        wallet.address,
        "0x100000000000000"
      ]);
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);
      await setWETHAmount({
        amount: new BigNumber(1e18).toFixed(0),
        userAddress: pool.address,
        network,
        provider
      });

      const newAssets: AssetEnabled[] = [
        { asset: WETH, isDeposit: true },
        {
          asset: COMPOUNDV3_WETH,
          isDeposit: false
        }
      ];
      await pool.managerLogic.changeAssets(newAssets, []);
    });
    beforeAfterReset({ beforeAll, afterAll, provider });

    it("approves unlimited WETH for cWETHv3 market", async () => {
      await pool.approveSpender(COMPOUNDV3_WETH, WETH, MAX_AMOUNT);
      const UsdcAllowanceDelta = await allowanceDelta(
        pool.address,
        WETH,
        COMPOUNDV3_WETH,
        pool.signer
      );
      await expect(UsdcAllowanceDelta.gt(0));
    });

    it("lends WETH to CompundV3 WETH market", async () => {
      const wethBalance = await pool.utils.getBalance(WETH, pool.address);
      await pool.lendCompoundV3(COMPOUNDV3_WETH, WETH, wethBalance);

      const cWETHTokenDelta = await balanceDelta(
        pool.address,
        COMPOUNDV3_WETH,
        pool.signer
      );
      expect(cWETHTokenDelta.gt(0));
    });
  });
};

testingHelper({
  network: Network.ARBITRUM,
  testingRun: testCompoundV3
});
