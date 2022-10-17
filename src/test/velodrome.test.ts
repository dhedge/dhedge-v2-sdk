/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dhedge } from "..";
import { Network } from "../types";
import { TEST_POOL, WSTETH, WETH } from "./constants";
import { getTxOptions } from "./txOptions";

import { wallet } from "./wallet";

const wETHwstETHLp = "0xBf205335De602ac38244F112d712ab04CB59A498";
// const wETHwstETHGauge = "0x131Ae347E654248671Afc885F0767cB605C065d7";

let dhedge: Dhedge;
let options: any;
jest.setTimeout(100000);

describe("pool", () => {
  beforeAll(async () => {
    dhedge = new Dhedge(wallet, Network.OPTIMISM);
    options = await getTxOptions(Network.OPTIMISM);
  });

  // it("approves unlimited WETH on for Velodrome", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.approve(
  //       Dapp.VELODROME,
  //       WSTETH,
  //       ethers.constants.MaxInt256,
  //       options
  //     );
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("adds WETH and wstETH to a Velodrome stable pool", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   const wethBalance = await dhedge.utils.getBalance(WETH, pool.address);
  //   const stwethBalance = await dhedge.utils.getBalance(WSTETH, pool.address);

  //   try {
  //     result = await pool.addLiquidityVelodrome(
  //       WETH,
  //       WSTETH,
  //       wethBalance,
  //       stwethBalance,
  //       true,
  //       options
  //     );
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("should stake wETH/wStETH LP in a gauge", async () => {
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   const balance = await dhedge.utils.getBalance(
  //     wETHwstETHLp,
  //     pool.address
  //   );
  //   const result = await pool.stakeInGauge(
  //     Dapp.VELODROME,
  //     wETHwstETHGauge,
  //     balance,
  //     options
  //   );
  //   console.log("result", result);
  //   expect(result).not.toBe(null);
  // });

  // it("should claim rewards from Gauge", async () => {
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   const result = await pool.claimFees(
  //     Dapp.VELODROME,
  //     wETHwstETHGauge,
  //     options
  //   );

  //   console.log("result", result);
  //   expect(result).not.toBe(null);
  // });

  // it("should unStake wETH/wStETH LP from a gauge", async () => {
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   const result = await pool.unstakeFromGauge(
  //     wETHwstETHGauge,
  //     "5633678495705584",
  //     options
  //   );
  //   console.log("result", result);
  //   expect(result).not.toBe(null);
  // });

  // it("approves unlimited wETH/stwETH LP for Velodrome", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.approve(
  //       Dapp.VELODROME,
  //       wETHwstETHLp,
  //       ethers.constants.MaxInt256,
  //       options
  //     );
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  it("should remove all liquidity from an existing pool ", async () => {
    const pool = await dhedge.loadPool(TEST_POOL);
    const balance = await dhedge.utils.getBalance(wETHwstETHLp, pool.address);
    const result = await pool.removeLiquidityVelodrome(
      WETH,
      WSTETH,
      balance,
      options
    );
    console.log("result", result);
    expect(result).not.toBe(null);
  });
});
