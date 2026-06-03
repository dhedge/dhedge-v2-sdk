/* eslint-disable @typescript-eslint/no-non-null-assertion */

import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { Dhedge, Pool } from "..";

import { routerAddress } from "../config";
import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import { getTxOptions } from "./txOptions";
import {
  TestingRunParams,
  fixOracleAggregatorStaleness,
  runWithImpersonateAccount,
  setChainlinkTimeout,
  setUSDCAmount,
  testingHelper,
  wait
} from "./utils/testingHelper";
import { balanceDelta } from "./utils/token";

const testOneInch = ({ wallet, network, provider }: TestingRunParams) => {
  const USDC = CONTRACT_ADDRESS[network].USDC;
  const WETH = CONTRACT_ADDRESS[network].WETH;

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`pool on ${network}`, () => {
    beforeAll(async () => {
      await provider.send("hardhat_setBalance", [
        wallet.address,
        "0x10000000000000000"
      ]);
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);

      await setChainlinkTimeout({ pool, provider }, 86400 * 365);
      await fixOracleAggregatorStaleness({ pool, provider });

      await runWithImpersonateAccount(
        { provider, account: await pool.managerLogic.manager() },
        async ({ signer }) => {
          await pool.managerLogic.connect(signer).setTrader(wallet.address);
          await pool.managerLogic.connect(signer).changeAssets(
            [
              [USDC, true],
              [WETH, true]
            ],
            []
          );
        }
      );

      await setUSDCAmount({
        amount: new BigNumber(2).times(1e6).toFixed(0),
        userAddress: pool.address,
        network,
        provider
      });
    });

    it("approves unlimited USDC on 1Inch", async () => {
      await pool.approve(Dapp.ONEINCH, USDC, MAX_AMOUNT);
      const iERC20 = new ethers.Contract(
        USDC,
        ["function allowance(address,address) view returns (uint256)"],
        pool.signer
      );
      const usdcAllowance = await iERC20.allowance(
        pool.address,
        routerAddress[network][Dapp.ONEINCH]!
      );
      expect(usdcAllowance.gt(0)).toBe(true);
    });

    it("gets gas estimation for 2 USDC into WETH on 1Inch", async () => {
      const gasEstimate = await pool.trade(
        Dapp.ONEINCH,
        USDC,
        WETH,
        "2000000",
        1,
        await getTxOptions(network),
        true
      );
      expect(gasEstimate.gas.gt(0)).toBe(true);
      expect(gasEstimate.minAmountOut).not.toBeNull();
    });

    it("gets error on gas estimation for 200 USDC into WETH on 1Inch", async () => {
      await wait(1);
      const gasEstimate = await pool.trade(
        Dapp.ONEINCH,
        USDC,
        WETH,
        "200000000",
        1,
        await getTxOptions(network),
        true
      );
      expect(gasEstimate.gasEstimationError).not.toBeNull();
    });

    it("trades 2 USDC into WETH on 1Inch", async () => {
      await wait(1);
      await pool.trade(
        Dapp.ONEINCH,
        USDC,
        WETH,
        "2000000",
        0.5,
        await getTxOptions(network)
      );
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
  network: Network.ARBITRUM,
  testingRun: testOneInch
});

// testingHelper({
//   network: Network.POLYGON,
//   onFork: false,
//   testingRun: testOneInch
// });

// testingHelper({
//   network: Network.BASE,
//   onFork: false,
//   testingRun: testOneInch
// });

// testingHelper({
//   network: Network.ETHEREUM,
//   testingRun: testOneInch
// });
