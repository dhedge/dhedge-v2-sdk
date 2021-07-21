import { ethers } from "ethers";

import { privateKey, providerUrl } from "../secrets";
import { AssetEnabled, Dapp, FundComposition, Network } from "../types";

import { Dhedge } from "./dhedge";

const myPool = "0xd63aA0Dce2311670608f1AB0667E43612F73340e";
//const pool2 = "0x1b8e0d4a6cb63281dc623fdfe5a85258d80a3d76"

const weth = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
const usdt = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const usdc = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const sushi = "0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a";
const wmatic = "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270";
const lpUsdcWeth = "0x34965ba0ac2451A34a0471F04CCa3F990b8dea27";
const tradeAmountUsdc = "1000000";
const liquidityAmountUsdt = "1000000";
const lpUsdcWETHAmount = "10951027354";
const depositAmountUsdc = "100000";

const provider = new ethers.providers.JsonRpcProvider(providerUrl);
const wallet = new ethers.Wallet(privateKey, provider);
let dhedge: Dhedge;

jest.setTimeout(100000);

describe("pool", () => {
  beforeAll(() => {
    dhedge = new Dhedge(wallet, Network.POLYGON);
  });

  it("approves unlimited SUSHI on sushiswap", async () => {
    let result;
    const pool = await dhedge.loadPool(myPool);
    try {
      result = await pool.approve(
        Dapp.SUSHISWAP,
        sushi,
        ethers.constants.MaxInt256
      );
      console.log(result);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });

  it("trades 1 USDC into WETH on sushiswap", async () => {
    let result;
    const pool = await dhedge.loadPool(myPool);
    try {
      result = await pool.trade(Dapp.SUSHISWAP, usdc, weth, tradeAmountUsdc);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });

  it("checks fund composition", async () => {
    let result: FundComposition[] = [];
    const pool = await dhedge.loadPool(myPool);
    try {
      result = await pool.getComposition();
      console.log(result);
    } catch (e) {
      console.log(e);
    }
    expect(result.length).toBeGreaterThan(0);
  });

  it("approve USDC balance of User for Deposit", async () => {
    let result;
    const pool = await dhedge.loadPool(myPool);
    try {
      result = await pool.approveDeposit(usdt, ethers.constants.MaxUint256);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });

  it("deposit 0.1 USDC into Pool", async () => {
    let result;
    const pool = await dhedge.loadPool(myPool);
    try {
      result = await pool.deposit(usdc, depositAmountUsdc);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });

  it("adds LpUSDCWETH/SUSHI/WMATIC to enabled assets", async () => {
    let result;
    const pool = await dhedge.loadPool(myPool);
    const newAssets: AssetEnabled[] = [
      { asset: usdc, isDeposit: true },
      { asset: weth, isDeposit: true },
      { asset: usdt, isDeposit: true },
      { asset: lpUsdcWeth, isDeposit: false },
      { asset: sushi, isDeposit: false },
      { asset: wmatic, isDeposit: false }
    ];
    try {
      result = await pool.changeAssets(newAssets);
      console.log(result);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });

  it("removes all assets except USDC and USDT", async () => {
    let result;
    const pool = await dhedge.loadPool(myPool);
    const newAssets: AssetEnabled[] = [
      { asset: usdc, isDeposit: false },
      { asset: weth, isDeposit: true }
    ];
    try {
      result = await pool.changeAssets(newAssets);
      console.log(result);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });

  it("adds Liquidity into a WETH/USDT pool on sushi", async () => {
    let result;
    const pool = await dhedge.loadPool(myPool);
    const liquidityAmountWETH = await dhedge.utils.getLpAmount(
      Dapp.SUSHISWAP,
      usdt,
      weth,
      liquidityAmountUsdt
    );
    try {
      result = await pool.addLiquidity(
        Dapp.SUSHISWAP,
        usdt,
        weth,
        liquidityAmountUsdt,
        liquidityAmountWETH
      );
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });

  it("approves unlimited LP USDC/WETH on sushiswap for staking", async () => {
    let result;
    const pool = await dhedge.loadPool(myPool);
    try {
      result = await pool.approve(
        Dapp.SUSHISWAP,
        lpUsdcWeth,
        ethers.constants.MaxUint256,
        true
      );
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });

  it("deposit 0.1 USDC into Pool", async () => {
    let result;
    const pool = await dhedge.loadPool(myPool);
    try {
      result = await pool.deposit(usdc, depositAmountUsdc);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });

  it("adds LpUSDCWETH to enabled assets", async () => {
    let result;
    const pool = await dhedge.loadPool(myPool);
    const newAssets: AssetEnabled[] = [
      { asset: usdc, isDeposit: true },
      { asset: weth, isDeposit: true },
      { asset: usdt, isDeposit: true },
      { asset: lpUsdcWeth, isDeposit: false }
    ];
    try {
      result = await pool.changeAssets(newAssets);
      console.log(result);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });

  it("stakes USDC/WETH LP on sushi", async () => {
    let result;
    const pool = await dhedge.loadPool(myPool);
    try {
      result = await pool.stake(Dapp.SUSHISWAP, lpUsdcWeth, lpUsdcWETHAmount);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });

  it("trades entire sushi balance into usdc", async () => {
    let result: FundComposition[] = [];
    let tx;
    const pool = await dhedge.loadPool(myPool);
    try {
      result = await pool.getComposition();
      const sushiBalance = result.find(e => e.asset === sushi)?.balance;
      if (sushiBalance) {
        tx = await pool.trade(Dapp.SUSHISWAP, sushi, usdc, sushiBalance);
        console.log(tx);
      }
    } catch (e) {
      console.log(e);
    }
    expect(result.length).toBeGreaterThan(0);
  });
});
