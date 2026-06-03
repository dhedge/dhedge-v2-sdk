/* eslint-disable @typescript-eslint/no-non-null-assertion */
import BigNumber from "bignumber.js";
import { Dhedge, Pool } from "..";
import { routerAddress } from "../config";
import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT } from "./constants";
import {
  TestingRunParams,
  fixOracleAggregatorStaleness,
  setChainlinkTimeout,
  setUSDCAmount,
  testingHelper
} from "./utils/testingHelper";
import { allowanceDelta, balanceDelta } from "./utils/token";

const testAave = ({ wallet, network, provider }: TestingRunParams) => {
  const USDC = CONTRACT_ADDRESS[network].USDC;
  const WBTC = CONTRACT_ADDRESS[network].WBTC;

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`[${network}] aave v3 tests`, () => {
    beforeAll(async () => {
      await provider.send("hardhat_setBalance", [
        wallet.address,
        "0x10000000000000000"
      ]);
      dhedge = new Dhedge(wallet, network);

      pool = await dhedge.createPool("Test Manager", "Aave Test", "AT", [
        [USDC, true],
        [WBTC, false],
        [routerAddress[network][Dapp.AAVEV3]!, false]
      ]);

      await setChainlinkTimeout({ pool, provider }, 86400 * 365);
      await fixOracleAggregatorStaleness({ pool, provider });

      await setUSDCAmount({
        amount: new BigNumber(1000).times(1e6).toFixed(0),
        userAddress: pool.address,
        network,
        provider
      });
    });

    it("approves unlimited USDC on Aave Lending pool", async () => {
      await pool.approve(Dapp.AAVEV3, USDC, MAX_AMOUNT);
      const usdcAllowanceDelta = await allowanceDelta(
        pool.address,
        USDC,
        routerAddress[network][Dapp.AAVEV3]!,
        pool.signer
      );
      expect(usdcAllowanceDelta.gt(0)).toBe(true);
    });

    it("approves unlimited WBTC on Aave Lending pool", async () => {
      await pool.approve(Dapp.AAVEV3, WBTC, MAX_AMOUNT);
      const wbtcAllowanceDelta = await allowanceDelta(
        pool.address,
        WBTC,
        routerAddress[network][Dapp.AAVEV3]!,
        pool.signer
      );
      expect(wbtcAllowanceDelta.gt(0)).toBe(true);
    });

    it("lends 500 USDC into Aave lending pool", async () => {
      await pool.lend(Dapp.AAVEV3, USDC, "500000000");
      const usdcBalanceDelta = await balanceDelta(
        pool.address,
        USDC,
        pool.signer
      );
      expect(usdcBalanceDelta.eq("-500000000")).toBe(true);
    });

    it("borrows 0.0001 WBTC from Aave lending pool", async () => {
      await pool.borrow(Dapp.AAVEV3, WBTC, "10000");
      const wbtcBalanceDelta = await balanceDelta(
        pool.address,
        WBTC,
        pool.signer
      );
      expect(wbtcBalanceDelta.eq("10000")).toBe(true);
    });

    it("repays 0.0001 WBTC to Aave lending pool", async () => {
      await pool.repay(Dapp.AAVEV3, WBTC, "10000");
      const wbtcBalanceDelta = await balanceDelta(
        pool.address,
        WBTC,
        pool.signer
      );
      expect(wbtcBalanceDelta.eq("-10000")).toBe(true);
    });

    it("withdraws 400 USDC from Aave lending pool", async () => {
      await pool.withdrawDeposit(Dapp.AAVEV3, USDC, "400000000");
      const usdcBalanceDelta = await balanceDelta(
        pool.address,
        USDC,
        pool.signer
      );
      expect(usdcBalanceDelta.eq("400000000")).toBe(true);
    });
  });
};

testingHelper({
  network: Network.ARBITRUM,
  testingRun: testAave
});
