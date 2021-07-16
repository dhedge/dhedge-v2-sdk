// import { Dapp } from "../types";
// import * as utils from "../utils";

// import { AssetEnabled } from "../types";
// import { FundComposition } from "../types";

import { Dhedge } from "./dhedge";

// const myPool = "0xd63aA0Dce2311670608f1AB0667E43612F73340e";
const pool2 = "0x1b8e0d4a6cb63281dc623fdfe5a85258d80a3d76"

// const weth = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
// const usdt = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const usdc = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
//const sushi =  "0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a";
//const lpUsdcWeth = "0x34965ba0ac2451A34a0471F04CCa3F990b8dea27";
// const tradeAmountUsdc = "1000000";
// const liquidityAmountUsdt = "1000000";
const depositAmountUsdc = "100000";

jest.setTimeout(100000);

describe("pool", () => {
  // it("approves unlimited USDC on sushiswap", async () => {
  //   let result;
  //   const dhedge = new Dhedge();
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.approve(Dapp.SUSHISWAP, usdc);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("trades 1 USDC into WETH on sushiswap", async () => {
  //   let result;
  //   const dhedge = new Dhedge();
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.trade(Dapp.SUSHISWAP, usdc, weth, tradeAmountUsdc);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("checks fund composition", async () => {
  //   let result: FundComposition[] = [];
  //   const dhedge = new Dhedge();
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.getComposition();
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result.length).toBeGreaterThan(0);
  // });

  it("approve USDC balance of User for Deposit", async () => {
    let result = {};
    const dhedge = new Dhedge();
    const pool = await dhedge.loadPool(pool2);
    try {
      result = await pool.approveDeposit(pool2, usdc);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });

  it("deposit 0.1 USDC into Pool", async () => {
    let result;
    const dhedge = new Dhedge();
    const pool = await dhedge.loadPool(pool2);
    try {
      result = await pool.deposit(usdc, depositAmountUsdc);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });

  // it("adds LpUSDCWETH to enabled assets", async () => {
  //   let result: any;
  //   const dhedge = new Dhedge();
  //   const pool = await dhedge.loadPool(myPool);
  //   const newAssets: AssetEnabled[] = [
  //     { asset: usdc, isDeposit: true },
  //     { asset: weth, isDeposit: true },
  //     { asset: usdt, isDeposit: true },
  //     { asset: lpUsdcWeth, isDeposit: false }
  //   ];
  //   try {
  //     result = await pool.changeAssets(newAssets);
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("removes USDT from enabled assets and removes deposit from USDC", async () => {
  //   let result: any;
  //   const dhedge = new Dhedge();
  //   const pool = await dhedge.loadPool(myPool);
  //   const newAssets: AssetEnabled[] = [
  //     { asset: usdc, isDeposit: false },
  //     { asset: weth, isDeposit: true }
  //   ];
  //   try {
  //     result = await pool.getComposition();
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("adds Liquidity into a WETH/USDT pool on sushi", async () => {
  //   let result;
  //   const dhedge = new Dhedge();
  //   const pool = await dhedge.loadPool(myPool);
  //   const liquidityAmountWETH = await utils.calculateLpAmount(
  //     Dapp.SUSHISWAP,
  //     usdt,
  //     weth,
  //     liquidityAmountUsdt,
  //     dhedge.signer
  //   );
  //   try {
  //     result = await pool.addLiquidity(
  //       Dapp.SUSHISWAP,
  //       usdt,
  //       weth,
  //       liquidityAmountUsdt,
  //       liquidityAmountWETH
  //     );
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });
});
