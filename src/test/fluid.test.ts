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

const testFluid = ({ network, provider }: TestingRunParams) => {
  const WETH = CONTRACT_ADDRESS[network].WETH;
  const FLUID_WETH = CONTRACT_ADDRESS[network].FLUID_WETH;

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
          asset: FLUID_WETH,
          isDeposit: false
        }
      ];
      await pool.managerLogic.changeAssets(newAssets, []);
    });
    beforeAfterReset({ beforeAll, afterAll, provider });

    it("approves unlimited WETH for fWETH market", async () => {
      await pool.approveSpender(FLUID_WETH, WETH, MAX_AMOUNT);
      const wethAllowanceDelta = await allowanceDelta(
        pool.address,
        WETH,
        FLUID_WETH,
        pool.signer
      );
      await expect(wethAllowanceDelta.gt(0));
    });

    it("lends WETH to Fluid WETH market", async () => {
      const wethBalance = await pool.utils.getBalance(WETH, pool.address);
      await pool.lendCompoundV3(FLUID_WETH, WETH, wethBalance);

      const fWETHTokenDelta = await balanceDelta(
        pool.address,
        FLUID_WETH,
        pool.signer
      );
      expect(fWETHTokenDelta.gt(0));
    });

    it("withdraw WETH from Fluid WETH market", async () => {
      const fWETHBalance = await pool.utils.getBalance(
        FLUID_WETH,
        pool.address
      );
      await pool.withdrawCompoundV3(FLUID_WETH, WETH, fWETHBalance);
      const wethBalance = await balanceDelta(pool.address, WETH, pool.signer);
      expect(wethBalance.gt(0));
    });
  });
};

testingHelper({
  network: Network.ARBITRUM,
  testingRun: testFluid
});
