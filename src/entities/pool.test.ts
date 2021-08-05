import { ethers } from "ethers";

import { privateKey, providerUrl } from "../secrets";
import { Network } from "../types";

import { Dhedge } from "./dhedge";

const myPool = "0xbae28251b2a4e621aa7e20538c06dee010bc06de";

// const weth = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
//const usdt = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
//const dai = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
//const usdc = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
// const sushi = "0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a";
// const wmatic = "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270";
// const lpUsdcWeth = "0x34965ba0ac2451A34a0471F04CCa3F990b8dea27";
//const lpUsdcDai = "0xCD578F016888B57F1b1e3f887f392F0159E26747";
// const tradeAmountUsdc = "1000000";
// const liquidityAmountUsdt = "1000000";
// const lpUsdcWETHAmount = "10951027354";
// const depositAmountUsdc = "100000";

const provider = new ethers.providers.JsonRpcProvider(providerUrl);
const wallet = new ethers.Wallet(privateKey, provider);
let dhedge: Dhedge;

jest.setTimeout(100000);

describe("pool", () => {
  beforeAll(() => {
    dhedge = new Dhedge(wallet, Network.POLYGON);
  });

  // it("checks fund composition", async () => {
  //   const pool = await dhedge.loadPool(myPool);
  //   const result = await pool.getComposition();
  //   expect(result.length).toBeGreaterThan(0);
  // });

  it("withdraws 1.00002975 fund tokens", async () => {
    const pool = await dhedge.loadPool(myPool)
    const result = await pool.withdraw("1000029750000000000");
    expect(result).toBeGreaterThan(0);
  })

  // it("approves unlimited SUSHI on sushiswap", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.approve(
  //       Dapp.SUSHISWAP,
  //       sushi,
  //       ethers.constants.MaxInt256
  //     );
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("trades 0.5 USDC into USDT on sushiswap", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.trade(Dapp.SUSHISWAP, usdc, usdt, "500000", "497382");
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
  //     { asset: lpUsdcWeth, isDeposit: false },
  //     { asset: sushi, isDeposit: false },
  //     { asset: wmatic, isDeposit: false }
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
