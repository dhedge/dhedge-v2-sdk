/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dhedge, ethers } from "..";
import { Dapp, Network } from "../types";
import { ARRAKIS_USDC_WETH_GAUGE, TEST_POOL, USDC, WETH } from "./constants";
import { getTxOptions } from "./txOptions";

import { wallet } from "./wallet";

let dhedge: Dhedge;
let options: any;
jest.setTimeout(100000);

describe("pool", () => {
  beforeAll(async () => {
    dhedge = new Dhedge(wallet, Network.OPTIMISM);
    options = await getTxOptions(Network.OPTIMISM);
  });

  it("approves unlimited USDC on Arrakis", async () => {
    const pool = await dhedge.loadPool(TEST_POOL);
    const result = await pool.approve(
      Dapp.ARRAKIS,
      USDC,
      ethers.constants.MaxInt256,
      options
    );
    expect(result).not.toBe(null);
  });

  it("approves unlimited WETH on Arrakis", async () => {
    const pool = await dhedge.loadPool(TEST_POOL);
    const result = await pool.approve(
      Dapp.ARRAKIS,
      WETH,
      ethers.constants.MaxInt256,
      options
    );
    console.log(result);
    expect(result).not.toBe(null);
  });

  it("should add liquidity and stake in an WETH/USDC Arrakis pool", async () => {
    const pool = await dhedge.loadPool(TEST_POOL);
    const wethBalance = await pool.utils.getBalance(WETH, pool.address);
    const uasdBalance = await pool.utils.getBalance(USDC, pool.address);
    const lpBalance = await pool.utils.getBalance(
      ARRAKIS_USDC_WETH_GAUGE,
      pool.address
    );
    const result = await pool.increaseLiquidity(
      Dapp.ARRAKIS,
      ARRAKIS_USDC_WETH_GAUGE,
      uasdBalance,
      wethBalance,
      options
    );
    result.wait(1);
    const lpBalanceAfter = await pool.utils.getBalance(
      ARRAKIS_USDC_WETH_GAUGE,
      pool.address
    );
    expect(lpBalanceAfter.gt(lpBalance));
  });

  it("approves unlimited LP staking Token before on  Arrakis", async () => {
    const pool = await dhedge.loadPool(TEST_POOL);
    const result = await pool.approve(
      Dapp.ARRAKIS,
      ARRAKIS_USDC_WETH_GAUGE,
      ethers.constants.MaxInt256,
      options
    );
    expect(result).not.toBe(null);
  });

  it("should remove liquidity from an existing pool ", async () => {
    const pool = await dhedge.loadPool(TEST_POOL);
    const result = await pool.decreaseLiquidity(
      Dapp.ARRAKIS,
      ARRAKIS_USDC_WETH_GAUGE,
      100,
      options
    );
    result.wait(1);
    const lpBalanceAfter = await pool.utils.getBalance(
      ARRAKIS_USDC_WETH_GAUGE,
      pool.address
    );
    expect(lpBalanceAfter.eq(0));
  });

  // it("should claim fees an existing pool", async () => {
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   const result = await pool.claimFees(
  //     Dapp.ARRAKIS,
  //     ARRAKIS_USDC_WETH_GAUGE,
  //     options
  //   );
  //   console.log("result", result);
  //   expect(result).not.toBe(null);
  // });
});
