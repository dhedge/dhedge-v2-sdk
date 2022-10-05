/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dhedge } from "..";
import { Dapp, Network } from "../types";
import { TEST_POOL } from "./constants";
import { getTxOptions } from "./txOptions";

import { wallet } from "./wallet";

let dhedge: Dhedge;
let options: any;
jest.setTimeout(100000);

describe("pool", () => {
  beforeAll(async () => {
    dhedge = new Dhedge(wallet, Network.POLYGON);
    options = await getTxOptions(Network.POLYGON);
    //options = { gasLimit: "3000000" };
  });

  // it("approves unlimited WETH on for UniswapV3 LP", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.approveUniswapV3Liquidity(
  //       Dapp.KYBER,
  //       STMATIC,
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
  //   const wmaticBalance = await dhedge.utils.getBalance(WMATIC, pool.address);
  //   const stmaticBalance = await dhedge.utils.getBalance(STMATIC, pool.address);

  //   try {
  //     result = await pool.addLiquidityUniswapV3(
  //       Dapp.KYBER,
  //       WMATIC,
  //       STMATIC,
  //       wmaticBalance,
  //       stmaticBalance,
  //       null,
  //       null,
  //       -422,
  //       -403,
  //       10,
  //       options
  //     );
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  it("should remove liquidity from an existing pool ", async () => {
    const pool = await dhedge.loadPool(TEST_POOL);
    const result = await pool.decreaseLiquidity(
      Dapp.KYBER,
      "5632",
      100,
      options
    );
    console.log("result", result);
    expect(result).not.toBe(null);
  });

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
