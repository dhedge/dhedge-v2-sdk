import { ethers } from "ethers";

import { privateKey, providerUrl } from "../secrets";
import { Dapp, Network } from "../types";

import { Dhedge } from "./index";

//const weth = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
const usdt = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const usdc = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174";
//const lpUsdcWeth = "0x34965ba0ac2451A34a0471F04CCa3F990b8dea27";
//const tradeAmountUsdt = "1000000";
//const tradeAmountWeth = "1000000000000000000";

const provider = new ethers.providers.JsonRpcProvider(providerUrl);
const wallet = new ethers.Wallet(privateKey, provider);
let dhedge: Dhedge;

jest.setTimeout(100000);

describe("utils", () => {
  beforeAll(() => {
    dhedge = new Dhedge(wallet, Network.POLYGON);
  });

  // it("calculates lp amount of WETH given 1 USDT to the USDT/WETH pool", async () => {
  //   const result = await dhedge.utils.calculateLpAmount(
  //     Dapp.SUSHISWAP,
  //     usdt,
  //     weth,
  //     tradeAmountUsdt
  //   );
  //   expect(Number(result)).toBeLessThan((1 / 800) * 1e18);
  //   expect(Number(result)).toBeGreaterThan((1 / 5000) * 1e18);
  // });

  // it("calculates lp amount of USDT given 1 WETH to the USDT/WETH pool", async () => {
  //   const result = await dhedge.utils.calculateLpAmount(
  //     Dapp.SUSHISWAP,
  //     weth,
  //     usdt,
  //     tradeAmountWeth
  //   );
  //   expect(Number(result)).toBeGreaterThan(800000000); //ETH price 800 USD
  //   expect(Number(result)).toBeLessThan(5000000000); //ETH price 5000 USD
  // });

  // it("calculates lp amount of USDC given 1 USDT to the USDT/USDC pool", async () => {
  //   const result = await dhedge.utils.getLpAmount(
  //     Dapp.SUSHISWAP,
  //     usdt,
  //     usdc,
  //     tradeAmountUsdt
  //   );
  //   console.log(result);
  //   expect(Number(result)).toBeLessThan(1.2);
  //   expect(Number(result)).toBeGreaterThan(0.9);
  // });

  it("calculates lp ratio of the USDT/USDC pool", async () => {
    const result = await dhedge.utils.getLpRatio(Dapp.SUSHISWAP, usdt, usdc);
    console.log(result.toString());
    expect(Number(result)).toBeLessThan(1.2);
    expect(Number(result)).toBeGreaterThan(0.9);
  });

  // it("gets pool Id of sushi LP pool for USDC/WETH pool", async () => {
  //   const result = await dhedge.utils.getLpPoolId(Dapp.SUSHISWAP, lpUsdcWeth);
  //   expect(result).toBe(1);
  // });
});
