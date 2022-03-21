/* eslint-disable @typescript-eslint/no-explicit-any */
import { FeeAmount } from "@uniswap/v3-sdk";
import { Dhedge } from "..";
import { Network } from "../types";
import { TEST_POOL, USDC, WETH } from "./constants";
//import { getTxOptions } from "./txOptions";

import { wallet } from "./wallet";

let dhedge: Dhedge;
let options: any;
jest.setTimeout(100000);

describe("pool", () => {
  beforeAll(async () => {
    dhedge = new Dhedge(wallet, Network.OPTIMISM);
    //options = await getTxOptions();
    options = { gasLimit: "3000000" };
  });

  // it("approves unlimited WETH on for UniswapV3 LP", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.approveUniswapV3Liquidity(
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
  //   const result = await pool.removeLiquidityUniswapV3("84405", 100, options);
  //   console.log("result", result);
  //   expect(result).not.toBe(null);
  // });

  // it("should increase liquidity in an existing pool WETH/WBTC pool", async () => {
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   const result = await pool.increaseLiquidityUniswapV3(
  //     "54929",
  //     "1317",
  //     "143980000000000",
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

  it("should swap USDC into WETH on UniswapV3 pool", async () => {
    const pool = await dhedge.loadPool(TEST_POOL);
    const result = await pool.tradeUniswapV3(
      USDC,
      WETH,
      "1000000",
      FeeAmount.LOW,
      1,
      options
    );

    console.log(result);
    expect(result).not.toBe(null);
  });
});
