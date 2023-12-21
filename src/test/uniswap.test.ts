/* eslint-disable @typescript-eslint/no-explicit-any */
import { FeeAmount } from "@uniswap/v3-sdk";
import { Dhedge, ethers, Pool } from "..";
import { routerAddress } from "../config";
import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, TEST_POOL } from "./constants";
import { allowanceDelta, balanceDelta } from "./utils/token";
import {
  setUSDCAmount,
  testingHelper,
  TestingRunParams
} from "./utils/testingHelper";
import BigNumber from "bignumber.js";

const testUniswapV3 = ({ wallet, network, provider }: TestingRunParams) => {
  let dhedge: Dhedge;
  let pool: Pool;

  jest.setTimeout(100000);
  describe(`testUniswapV3 on ${network}`, () => {
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
        amount: new BigNumber(100).times(1e18).toFixed(0),
        userAddress: pool.address,
        network,
        provider
      });
    });

    it("approves unlimited USDC on for trading on UniswapV3", async () => {
      await pool.approve(
        Dapp.UNISWAPV3,
        CONTRACT_ADDRESS[network].USDC,
        ethers.constants.MaxUint256
      );
      const UsdcAllowanceDelta = await allowanceDelta(
        pool.address,
        CONTRACT_ADDRESS[network].USDC,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        routerAddress[network].uniswapV3!,
        pool.signer
      );
      expect(UsdcAllowanceDelta.gte(0));
    });

    it("should swap 5 USDC into WETH on UniswapV3", async () => {
      await pool.tradeUniswapV3(
        CONTRACT_ADDRESS[network].USDC,
        CONTRACT_ADDRESS[network].WETH,
        "5000000",
        FeeAmount.LOW,
        0.5
      );

      const wethAllowanceDelta = await balanceDelta(
        pool.address,
        CONTRACT_ADDRESS[network].WETH,
        pool.signer
      );
      expect(wethAllowanceDelta.gt(0));
    });

    // it("approves unlimited WETH on for UniswapV3 LP", async () => {
    //   await pool.approveUniswapV3Liquidity(
    //     CONTRACT_ADDRESS[network].USDC,
    //     ethers.constants.MaxInt256
    //   );
    //   const UsdcAllowanceDelta = await allowanceDelta(
    //     pool.address,
    //     CONTRACT_ADDRESS[network].USDC,
    //     pool.address,
    //     pool.signer
    //   );

    //   expect(result).not.toBe(null);
    // });

    // it("adds WETH and WBTC to a new V3 pool", async () => {
    //   let result;
    //   const pool = await dhedge.loadPool(TEST_POOL);
    //   const usdcBalance = await dhedge.utils.getBalance(USDC, pool.address);
    //   const wethBalance = await dhedge.utils.getBalance(WETH, pool.address);

    //   try {
    //     result = await pool.addLiquidityUniswapV3(
    //       USDC,
    //       WETH,
    //       usdcBalance,
    //       wethBalance,
    //       0.0003,
    //       0.0004,
    //       null,
    //       null,
    //       FeeAmount.LOW,
    //       options
    //     );
    //     console.log(result);
    //   } catch (e) {
    //     console.log(e);
    //   }
    //   expect(result).not.toBe(null);
    // });

    // it("should remove liquidity from an existing pool ", async () => {
    //   const pool = await dhedge.loadPool(TEST_POOL);
    //   const result = await pool.decreaseLiquidity(
    //     Dapp.UNISWAPV3,
    //     "110507",
    //     100,
    //     options
    //   );
    //   console.log("result", result);
    //   expect(result).not.toBe(null);
    // });

    // it("should increase liquidity in an existing pool WETH/WBTC pool", async () => {
    //   const pool = await dhedge.loadPool(TEST_POOL);
    //   const result = await pool.increaseLiquidity(
    //     Dapp.UNISWAPV3,
    //     "110507",
    //     "244838",
    //     "258300000000000",
    //     options
    //   );
    //   console.log("result", result);
    //   expect(result).not.toBe(null);
    // });

    // it("should claim fees an existing pool", async () => {
    //   const pool = await dhedge.loadPool(TEST_POOL);
    //   const result = await pool.claimFeesUniswapV3("54929", options);
    //   console.log("result", result);
    //   expect(result).not.toBe(null);
    // });

    // it("approves unlimited USDC to swap on UniswapV3", async () => {
    //   let result;
    //   const pool = await dhedge.loadPool(TEST_POOL);
    //   try {
    //     result = await pool.approve(
    //       Dapp.UNISWAPV3,
    //       USDC,
    //       ethers.constants.MaxInt256,
    //       options
    //     );
    //     console.log(result);
    //   } catch (e) {
    //     console.log(e);
    //   }
    //   expect(result).not.toBe(null);
    // });

    // it("should swap USDC into WETH on UniswapV3 pool", async () => {
    //   const pool = await dhedge.loadPool(TEST_POOL);
    //   const result = await pool.tradeUniswapV3(
    //     USDC,
    //     WETH,
    //     "1000000",
    //     FeeAmount.LOW,
    //     1,
    //     options
    //   );

    //   console.log(result);
    //   expect(result).not.toBe(null);
    // });
  });
};

testingHelper({
  network: Network.OPTIMISM,
  testingRun: testUniswapV3
});

testingHelper({
  network: Network.POLYGON,
  testingRun: testUniswapV3
});

testingHelper({
  network: Network.BASE,
  testingRun: testUniswapV3
});
