/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { Dhedge, Pool, ethers } from "..";

import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import {
  TestingRunParams,
  setUSDCAmount,
  testingHelper,
  wait,
  runWithImpersonateAccount
} from "./utils/testingHelper";
import { allowanceDelta, balanceDelta } from "./utils/token";
import { getTxOptions } from "./txOptions";
import BigNumber from "bignumber.js";
import { routerAddress } from "../config";
import { getOdosSwapTxData } from "../services/odos";
import OdosRouterV3Abi from "../abi/odos/OdosRouterV3.json";
import PoolLogicAbi from "../abi/PoolLogic.json";
import PoolManagerLogicAbi from "../abi/PoolManagerLogic.json";

const testOdos = ({ wallet, network, provider }: TestingRunParams) => {
  const USDC = CONTRACT_ADDRESS[network].USDC;
  const WETH = CONTRACT_ADDRESS[network].WETH;

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`pool on ${network}`, () => {
    beforeAll(async () => {
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);
      // fork-only: authorize the test wallet by impersonating the pool manager
      // and setting the wallet as trader (avoids dh24 unauthorized executor)
      const poolLogic = new ethers.Contract(
        pool.address,
        PoolLogicAbi.abi,
        provider
      );
      const pmlAddress: string = await poolLogic.poolManagerLogic();
      const poolManagerLogic = new ethers.Contract(
        pmlAddress,
        PoolManagerLogicAbi.abi,
        provider
      );
      const manager: string = await poolManagerLogic.manager();
      const wethSupported: boolean = await poolManagerLogic.isSupportedAsset(
        WETH
      );
      await runWithImpersonateAccount(
        { account: manager, provider },
        async ({ signer }) => {
          await poolManagerLogic.connect(signer).setTrader(wallet.address);
          // fork-only: ensure WETH is a supported (destination) asset so the
          // Odos guard's isSupportedAsset check passes
          if (!wethSupported) {
            await poolManagerLogic
              .connect(signer)
              .changeAssets([{ asset: WETH, isDeposit: false }], []);
          }
        }
      );
      // top up gas
      await provider.send("hardhat_setBalance", [
        wallet.address,
        "0x10000000000000000"
      ]);
      await provider.send("evm_mine", []);
      // top up USDC
      await setUSDCAmount({
        amount: new BigNumber(20).times(1e6).toFixed(0),
        userAddress: pool.address,
        network,
        provider
      });
    });

    it("approves unlimited USDC on Odos", async () => {
      await pool.approve(Dapp.ODOS, USDC, MAX_AMOUNT);
      const usdcAllowanceDelta = await allowanceDelta(
        pool.address,
        USDC,
        routerAddress[network]["odos"]!,
        pool.signer
      );
      expect(usdcAllowanceDelta.gt(0)).toBe(true);
    });

    it("gets gas estimation for 10 USDC into WETH on Odos", async () => {
      const gasEstimate = await pool.trade(
        Dapp.ODOS,
        USDC,
        WETH,
        "10000000",
        1,
        await getTxOptions(network),
        true
      );
      expect(gasEstimate.gas.gt(0));
      expect(gasEstimate.minAmountOut).not.toBeNull();
    });

    it("trades 10 USDC into WETH on Odos", async () => {
      await wait(1);
      // inspect the swap txData: referral fee must be 0 (OdosV3ContractGuard)
      const { swapTxData } = await getOdosSwapTxData(
        pool,
        USDC,
        WETH,
        "10000000",
        0.5
      );
      const referralInfo = new ethers.utils.Interface(
        OdosRouterV3Abi.abi
      ).parseTransaction({ data: swapTxData }).args[3];
      expect(referralInfo.fee.isZero()).toBe(true);
      const feeRecipient: string = referralInfo.feeRecipient;

      await pool.trade(
        Dapp.ODOS,
        USDC,
        WETH,
        "10000000",
        0.5,
        await getTxOptions(network)
      );
      const wethBalanceDelta = await balanceDelta(
        pool.address,
        WETH,
        pool.signer
      );
      expect(wethBalanceDelta.gt(0)).toBe(true);
      // no WETH skimmed to the Odos router
      const wethBalanceDeltaForRouter = await balanceDelta(
        routerAddress[network]["odos"]!,
        WETH,
        pool.signer
      );
      expect(wethBalanceDeltaForRouter.eq(0)).toBe(true);
      // no WETH skimmed to the referral fee recipient encoded in the txData
      const wethBalanceDeltaForFeeRecipient = await balanceDelta(
        feeRecipient,
        WETH,
        pool.signer
      );
      expect(wethBalanceDeltaForFeeRecipient.eq(0)).toBe(true);
    });
  });
};

// testingHelper({
//   network: Network.OPTIMISM,
//   testingRun: testOdos
// });

// testingHelper({
//   network: Network.ARBITRUM,
//   testingRun: testOdos
// });

// testingHelper({
//   network: Network.POLYGON,
//   testingRun: testOdos
// });

// testingHelper({
//   network: Network.BASE,
//   testingRun: testOdos
// });

testingHelper({
  network: Network.ETHEREUM,
  testingRun: testOdos
});

// testingHelper({
//   network: Network.BASE,
//   testingRun: testOdos
// });
