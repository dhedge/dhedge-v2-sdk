import { Dhedge, Dapp, ethers } from "..";
import { Network } from "../types";

import { wallet } from "./wallet";

const myPool = "0x3deeba9ca29e2dd98d32eed8dd559dac55014615";

//const weth = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
//const usdt = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
//const dai = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
const usdc = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const frax = "0x104592a158490a9228070e0a8e5343b499e125d0";

// const sushi = "0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a";
// const wmatic = "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270";
// const lpUsdcWeth = "0x34965ba0ac2451A34a0471F04CCa3F990b8dea27";
//const lpUsdcDai = "0xCD578F016888B57F1b1e3f887f392F0159E26747";
//const amusdc = "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F";
//const lpUsdcUsdt = "0x4b1f1e2435a9c96f7330faea190ef6a7c8d70001";
// const tradeAmountUsdc = "1000000";
// const liquidityAmountUsdt = "1000000";
// const lpUsdcWETHAmount = "10951027354";
// const depositAmountUsdc = "100000";

let dhedge: Dhedge;

jest.setTimeout(100000);

const options = {
  gasLimit: 1000000,
  gasPrice: ethers.utils.parseUnits("35", "gwei")
};

describe("pool", () => {
  beforeAll(() => {
    dhedge = new Dhedge(wallet, Network.POLYGON);
  });

  // it("checks fund composition", async () => {
  //   const pool = await dhedge.loadPool(myPool);
  //   const result = await pool.getComposition();
  //   expect(result.length).toBeGreaterThan(0);
  // });

  // it("withdraws 1.00002975 fund tokens", async () => {
  //   const pool = await dhedge.loadPool(myPool)
  //   const result = await pool.withdraw("1000029750000000000");
  //   expect(result).toBeGreaterThan(0);
  // })

  // it("approves unlimited WETH on 1Inch", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.approve(
  //       Dapp.SUSHISWAP,
  //       weth,
  //       ethers.constants.MaxInt256,
  //       options
  //     );
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("lends 1 USDC into Aave lending pool", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.lend(Dapp.AAVE, usdc, "1000000", options);
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("withdraws 1 USDC from Aave lending pool", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.withdrawDeposit(Dapp.AAVE, usdc, "1000000", options);
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("borrows 0.0001 WETH from Aave lending pool", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.borrow(Dapp.AAVE, weth, "100000000000000");
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("reapys 0.0001 WETH to Aave lending pool", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.repay(Dapp.AAVE, weth, "100000000000000", options);
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  it("trades 0.1 USDC into WETH on 1inch", async () => {
    let result;
    const pool = await dhedge.loadPool(myPool);
    try {
      result = await pool.trade(
        Dapp.ONEINCH,
        usdc,
        frax,
        "500000",
        0.5,
        options
      );
      console.log("1inch", result);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });

  // it("trades 0.1 USDC into WETH on Sushi", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.trade(
  //       Dapp.SUSHISWAP,
  //       usdc,
  //       frax,
  //       "500000",
  //       0.5,
  //       options
  //     );
  //     console.log("sushi", result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("approve USDC balance of User for Deposit", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.approveDeposit(usdt, ethers.constants.MaxUint256);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("deposit 0.1 USDC into Pool", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.deposit(usdc, depositAmountUsdc);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("adds LpUSDCWETH/SUSHI/WMATIC to enabled assets", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   const newAssets: AssetEnabled[] = [
  //     { asset: usdc, isDeposit: true },
  //     { asset: weth, isDeposit: true },
  //     { asset: usdt, isDeposit: true },
  //     { asset: amusdc, isDeposit: false },
  //     { asset: lpUsdcUsdt, isDeposit: false }
  //   ];
  //   try {
  //     result = await pool.changeAssets(newAssets);
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("removes all assets except USDC and USDT", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   const newAssets: AssetEnabled[] = [
  //     { asset: usdc, isDeposit: false },
  //     { asset: weth, isDeposit: true }
  //   ];
  //   try {
  //     result = await pool.changeAssets(newAssets);
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("adds Liquidity into a WETH/USDT pool on sushi", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   const liquidityAmountWETH = await dhedge.utils.getLpAmount(
  //     Dapp.SUSHISWAP,
  //     usdt,
  //     weth,
  //     liquidityAmountUsdt
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

  // it("approves unlimited LP USDC/WETH on sushiswap for staking", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.approveStaking(
  //       Dapp.SUSHISWAP,
  //       lpUsdcDai,
  //       ethers.constants.MaxUint256
  //     );
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("deposit 0.1 USDC into Pool", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.deposit(usdc, depositAmountUsdc);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("adds LpUSDCWETH to enabled assets", async () => {
  //   let result;
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

  // it("unStakes USDC/DAI LP on sushi", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   const balance = "11013356749811";
  //   try {
  //     result = await pool.unStake(Dapp.SUSHISWAP, lpUsdcDai, balance);
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("trades entire sushi balance into usdc", async () => {
  //   let result: FundComposition[] = [];
  //   let tx;
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.getComposition();
  //     const sushiBalance = result.find(e => e.asset === sushi)?.balance;
  //     if (sushiBalance) {
  //       tx = await pool.trade(Dapp.SUSHISWAP, sushi, usdc, sushiBalance);
  //       console.log(tx);
  //     }
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result.length).toBeGreaterThan(0);
  // });

  // it("harvests USDC/DAI LP Farm on sushi", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.harvestRewards(Dapp.SUSHISWAP, lpUsdcdai);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("sets a trader account", async () => {
  //   let result;
  //   const newTrader = "0xC52D9a9D9b05a01887871216fF02bA4235e8503d";
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.setTrader(newTrader);
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("removes liquidity from  USDC/DAI LP on sushi", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   const balance = "11013356749811";
  //   try {
  //     result = await pool.removeLiquidity(Dapp.SUSHISWAP, usdc, dai, balance);
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });
});
