/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import BigNumber from "bignumber.js";
import { Dhedge, Pool } from "..";
import { AssetEnabled, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import {
  TestingRunParams,
  beforeAfterReset,
  setUSDCAmount,
  testingHelper
} from "./utils/testingHelper";
import { allowanceDelta, balanceDelta } from "./utils/token";
import { getWalletData } from "./wallet";

const testCompoundV3 = ({ network, provider }: TestingRunParams) => {
  const USDC = CONTRACT_ADDRESS[network].USDC;
  const COMPOUNDV3_USDC = CONTRACT_ADDRESS[network].COMPOUNDV3_USDC;

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`[${network}] aerodrome tests`, () => {
    beforeAll(async () => {
      const { wallet } = getWalletData(network);
      // top up ETH (gas)
      await provider.send("hardhat_setBalance", [
        wallet.address,
        "0x100000000000000"
      ]);
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);
      await setUSDCAmount({
        amount: new BigNumber(10).times(1e6).toFixed(0),
        userAddress: pool.address,
        network,
        provider
      });

      const newAssets: AssetEnabled[] = [
        { asset: USDC, isDeposit: true },
        {
          asset: COMPOUNDV3_USDC,
          isDeposit: false
        }
      ];
      await pool.managerLogic.changeAssets(newAssets, []);
    });
    beforeAfterReset({ beforeAll, afterAll, provider });

    it("approves unlimited USDC for cUSDCv3 market", async () => {
      await pool.approveSpender(COMPOUNDV3_USDC, USDC, MAX_AMOUNT);
      const UsdcAllowanceDelta = await allowanceDelta(
        pool.address,
        USDC,
        COMPOUNDV3_USDC,
        pool.signer
      );
      await expect(UsdcAllowanceDelta.gt(0));
    });

    it("lends USDC to CompundV3 USDC market", async () => {
      const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
      await pool.lendCompoundV3(COMPOUNDV3_USDC, USDC, usdcBalance);

      const cUSDCTokenDelta = await balanceDelta(
        pool.address,
        COMPOUNDV3_USDC,
        pool.signer
      );
      expect(cUSDCTokenDelta.gt(0));
    });
  });
};

testingHelper({
  network: Network.ARBITRUM,
  testingRun: testCompoundV3
});
