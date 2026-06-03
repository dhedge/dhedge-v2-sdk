/* eslint-disable @typescript-eslint/no-non-null-assertion */

import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { Dhedge, Pool } from "..";

import { routerAddress } from "../config";
import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
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

const testKyberSwap = ({ wallet, network, provider }: TestingRunParams) => {
  const USDC = CONTRACT_ADDRESS[network].USDC;
  const WETH = CONTRACT_ADDRESS[network].WETH;

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`kyberswap on ${network}`, () => {
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

    it("approves unlimited USDC on KyberSwap", async () => {
      await pool.approve(Dapp.KYBERSWAP, USDC, MAX_AMOUNT);
      const iERC20 = new ethers.Contract(
        USDC,
        ["function allowance(address,address) view returns (uint256)"],
        pool.signer
      );
      const usdcAllowance = await iERC20.allowance(
        pool.address,
        routerAddress[network][Dapp.KYBERSWAP]!
      );
      expect(usdcAllowance.gt(0)).toBe(true);
    });

    it("gets only amount and txData for 2 USDC into WETH on KyberSwap", async () => {
      const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
      const result = await pool.trade(
        Dapp.KYBERSWAP,
        USDC,
        WETH,
        usdcBalance,
        1,
        null,
        { estimateGas: false, onlyGetTxData: true }
      );
      expect(result.txData).not.toBeNull();
      expect(result.minAmountOut).not.toBeNull();
    });

    it("trades USDC balance into WETH on KyberSwap", async () => {
      await wait(1);
      const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
      await pool.trade(Dapp.KYBERSWAP, USDC, WETH, usdcBalance, 1);
      const wethBalanceDelta = await balanceDelta(
        pool.address,
        WETH,
        pool.signer
      );
      expect(wethBalanceDelta.gt(0)).toBe(true);
    });
  });
};

// testingHelper({
//   network: Network.PLASMA,
//   onFork: false,
//   testingRun: testKyberSwap
// });

testingHelper({
  network: Network.ARBITRUM,
  testingRun: testKyberSwap
});

// testingHelper({
//   network: Network.POLYGON,
//   onFork: false,
//   testingRun: testKyberSwap
// });

// testingHelper({
//   network: Network.BASE,
//   onFork: false,
//   testingRun: testKyberSwap
// });
