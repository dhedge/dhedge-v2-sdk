/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import BigNumber from "bignumber.js";
import { Dhedge, Pool } from "..";
import { routerAddress } from "../config";
import { AssetEnabled, Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import {
  TestingRunParams,
  setUSDCAmount,
  testingHelper,
  wait
} from "./utils/testingHelper";
import { allowanceDelta, balanceDelta } from "./utils/token";

const testArrakis = ({ wallet, network, provider }: TestingRunParams) => {
  const USDC = CONTRACT_ADDRESS[network].USDC;
  const WETH = CONTRACT_ADDRESS[network].WETH;
  const ARRAKIS_USDC_WETH_GAUGE =
    CONTRACT_ADDRESS[network].ARRAKIS_USDC_WETH_GAUGE;
  const ARRAKIS_USDC_WETH_LP = CONTRACT_ADDRESS[network].ARRAKIS_USDC_WETH_LP;
  const WMATIC = CONTRACT_ADDRESS[network].WMATIC;

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe("pool", () => {
    beforeAll(async () => {
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);

      // top up gas
      await provider.send("hardhat_setBalance", [
        wallet.address,
        "0x10000000000000000"
      ]);
      await provider.send("evm_mine", []);
      await setUSDCAmount({
        amount: new BigNumber(10000000).times(1e6).toFixed(0),
        userAddress: pool.address,
        network,
        provider
      });

      const newAssets: AssetEnabled[] = [
        { asset: USDC, isDeposit: true },
        { asset: WETH, isDeposit: true },
        { asset: ARRAKIS_USDC_WETH_GAUGE, isDeposit: false },
        { asset: WMATIC, isDeposit: false }, // reward token
        {
          asset: CONTRACT_ADDRESS[network].uniswapV3.nonfungiblePositionManager,
          isDeposit: false
        }
      ];
      await pool.changeAssets(newAssets);
      await pool.approve(Dapp.ONEINCH, USDC, MAX_AMOUNT);
      await pool.trade(Dapp.ONEINCH, USDC, WETH, "10000000", 0.5, null, false);
    });

    it("approves unlimited USDC on Arrakis", async () => {
      await pool.approve(Dapp.ARRAKIS, USDC, MAX_AMOUNT);
      const usdcAllowanceDelta = await allowanceDelta(
        pool.address,
        USDC,
        routerAddress[network].arrakis!,
        pool.signer
      );
      expect(usdcAllowanceDelta.gt(0)).toBe(true);
      await wait(5);
    });

    it("approves unlimited WETH on Arrakis", async () => {
      await pool.approve(Dapp.ARRAKIS, WETH, MAX_AMOUNT);
      const wethAllowanceDelta = await allowanceDelta(
        pool.address,
        USDC,
        routerAddress[network].arrakis!,
        pool.signer
      );
      expect(wethAllowanceDelta.gt(0)).toBe(true);
    });

    it("should add liquidity and stake in an WETH/USDC Arrakis pool", async () => {
      const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
      const wethBalance = await pool.utils.getBalance(WETH, pool.address);
      await pool.increaseLiquidity(
        Dapp.ARRAKIS,
        ARRAKIS_USDC_WETH_GAUGE,
        usdcBalance,
        wethBalance
      );
      const lpBalanceDelta = await balanceDelta(
        pool.address,
        ARRAKIS_USDC_WETH_LP,
        pool.signer
      );
      expect(lpBalanceDelta.gt(0)).toBe(true);
    });

    it("approves unlimited LP staking Token before on Arrakis", async () => {
      await pool.approve(Dapp.ARRAKIS, ARRAKIS_USDC_WETH_GAUGE, MAX_AMOUNT);
      const gaugeAllowanceDelta = await allowanceDelta(
        pool.address,
        ARRAKIS_USDC_WETH_GAUGE,
        routerAddress[network].arrakis!,
        pool.signer
      );
      expect(gaugeAllowanceDelta.gt(0)).toBe(true);
    });

    it("should remove liquidity from an existing pool ", async () => {
      await pool.decreaseLiquidity(Dapp.ARRAKIS, ARRAKIS_USDC_WETH_GAUGE, 100);
      const wethBalanceDelta = await balanceDelta(
        pool.address,
        WETH,
        pool.signer
      );
      expect(wethBalanceDelta.gt(0)).toBe(true);
    });
  });
};

testingHelper({
  network: Network.POLYGON,
  testingRun: testArrakis
});
