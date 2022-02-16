/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dhedge } from "..";
import { Network } from "../types";
import { TEST_POOL } from "./constants";
import { getTxOptions } from "./txOptions";

import { wallet } from "./wallet";

let dhedge: Dhedge;
let options: any;
jest.setTimeout(100000);

describe("pool", () => {
  beforeAll(async () => {
    dhedge = new Dhedge(wallet, Network.POLYGON);
    options = await getTxOptions();
  });

  // it("approves unlimited WETH on for UniswapV3 LP", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.approveUniswapV3Liquidity(
  //       WBTC,
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
  //   const wethBalance = await dhedge.utils.getBalance(WETH, pool.address);
  //   const daiBalance = await dhedge.utils.getBalance(WBTC, pool.address);

  //   try {
  //     result = await pool.addLiquidityUniswapV3(
  //       WETH,
  //       WBTC,
  //       wethBalance,
  //       daiBalance,
  //       0.04,
  //       0.11,
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
  //   const result = await pool.removeLiquidityUniswapV3("54929", 50, options);
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

  it("should claim fees an existing pool", async () => {
    const pool = await dhedge.loadPool(TEST_POOL);
    const result = await pool.claimFeesUniswapV3("54929", options);
    console.log("result", result);
    expect(result).not.toBe(null);
  });
});
