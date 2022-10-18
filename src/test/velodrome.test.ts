/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dhedge, ethers } from "..";
import { Dapp, Network } from "../types";
import { TEST_POOL, WETH, WSTETH } from "./constants";
import { getTxOptions } from "./txOptions";

import { wallet } from "./wallet";

const wETHwstETHLp = "0xBf205335De602ac38244F112d712ab04CB59A498";
const wETHwstETHGauge = "0x131Ae347E654248671Afc885F0767cB605C065d7";

let dhedge: Dhedge;
let options: any;
jest.setTimeout(100000);

describe("pool", () => {
  beforeAll(async () => {
    dhedge = new Dhedge(wallet, Network.OPTIMISM);
    options = await getTxOptions(Network.OPTIMISM);
  });

  it("approves unlimited WETH on for Velodrome", async () => {
    let result;
    const pool = await dhedge.loadPool(TEST_POOL);
    try {
      result = await pool.approve(
        Dapp.VELODROME,
        WSTETH,
        ethers.constants.MaxInt256,
        options
      );
      console.log(result);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });

  it("adds WETH and wstETH to a Velodrome stable pool", async () => {
    const pool = await dhedge.loadPool(TEST_POOL);
    const wethBalance = await dhedge.utils.getBalance(WETH, pool.address);
    const stwethBalance = await dhedge.utils.getBalance(WSTETH, pool.address);

    const result = await pool.addLiquidityVelodrome(
      WETH,
      WSTETH,
      wethBalance,
      stwethBalance,
      true,
      options
    );

    result.wait(1);
    const lpBalance = await dhedge.utils.getBalance(wETHwstETHLp, pool.address);
    expect(lpBalance.gt(0));
  });

  it("should stake wETH/wStETH LP in a gauge", async () => {
    const pool = await dhedge.loadPool(TEST_POOL);
    const balance = await dhedge.utils.getBalance(wETHwstETHLp, pool.address);
    const result = await pool.stakeInGauge(
      Dapp.VELODROME,
      wETHwstETHGauge,
      balance,
      options
    );
    result.wait(1);
    const gaugeBalance = await dhedge.utils.getBalance(
      wETHwstETHGauge,
      pool.address
    );
    expect(gaugeBalance.gt(0));
  });

  it("should claim rewards from Gauge", async () => {
    const pool = await dhedge.loadPool(TEST_POOL);
    const result = await pool.claimFees(
      Dapp.VELODROME,
      wETHwstETHGauge,
      options
    );
    result.wait(1);
    const velBalance = await dhedge.utils.getBalance(VEL, pool.address);
    expect(velBalance.gt(0));
  });

  it("should unStake wETH/wStETH LP from a gauge", async () => {
    const pool = await dhedge.loadPool(TEST_POOL);
    const gaugeBalance = await dhedge.utils.getBalance(
      wETHwstETHGauge,
      pool.address
    );
    const result = await pool.unstakeFromGauge(
      wETHwstETHGauge,
      gaugeBalance,
      options
    );
    result.wait(1);
    const lpBalance = await dhedge.utils.getBalance(wETHwstETHLp, pool.address);
    expect(lpBalance.gt(0));
    const gaugeBalanceAfter = await dhedge.utils.getBalance(
      wETHwstETHGauge,
      pool.address
    );
    expect(gaugeBalanceAfter.eq(0));
  });

  it("approves unlimited wETH/stwETH LP for Velodrome", async () => {
    let result;
    const pool = await dhedge.loadPool(TEST_POOL);
    try {
      result = await pool.approve(
        Dapp.VELODROME,
        wETHwstETHLp,
        ethers.constants.MaxInt256,
        options
      );
      console.log(result);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });

  it("should remove all liquidity from an existing pool ", async () => {
    const pool = await dhedge.loadPool(TEST_POOL);
    const balance = await dhedge.utils.getBalance(wETHwstETHLp, pool.address);
    const result = await pool.removeLiquidityVelodrome(
      WETH,
      WSTETH,
      balance,
      options
    );
    result.wait(1);
    const balanceAfter = await dhedge.utils.getBalance(
      wETHwstETHLp,
      pool.address
    );
    expect(balanceAfter.eq(0));
  });
});
