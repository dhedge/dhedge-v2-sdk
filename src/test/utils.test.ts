//import { ethers } from "ethers";
import { Dhedge } from "..";
import { Network } from "../types";

import { wallet } from "./wallet";

const myPool = "0xe3528a438b94e64669def9b875c381c46ef713bf";

// const usdt = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const usdc = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174";
const weth = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
const wbtc = "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6";
// const lpUsdcWeth = "0x34965ba0ac2451A34a0471F04CCa3F990b8dea27";

let dhedge: Dhedge;

jest.setTimeout(100000);

describe("utils", () => {
  beforeAll(() => {
    dhedge = new Dhedge(wallet, Network.POLYGON);
  });

  // it("gets lp ratio of the USDT/USDC pool", async () => {
  //   const result = await dhedge.utils.getLpReserves(Dapp.SUSHISWAP, usdc, usdt);
  //   expect(Number(result.assetA) / Number(result.assetB)).toBeGreaterThan(0.9);
  // });

  // it("gets pool id of sushi LP pool for USDC/WETH", async () => {
  //   const result = await dhedge.utils.getLpPoolId(Dapp.SUSHISWAP, lpUsdcWeth);
  //   expect(result).toBe(1);
  // });

  // it("gets USDC balance of a pool", async () => {
  //   const result = await dhedge.utils.getBalance(usdc, myPool);
  //   expect(result.gt(0));
  // });
  // it("gets minumum amount out of WETH for 1 USDC", async () => {
  //   const result = await dhedge.utils.getMinAmountOut(
  //     Dapp.SUSHISWAP,
  //     usdc,
  //     weth,
  //     "1000000",
  //     0.5
  //   );
  //   expect(result.gt(0));
  // });

  it("gets Balancer pool tx data", async () => {
    const pool = await dhedge.loadPool(myPool);
    const assets = [wbtc, usdc, weth];
    const amounts = ["0", "1000000", "0"];
    const result = await dhedge.utils.getBalancerJoinPoolTx(
      pool,
      "0x03cd191f589d12b0582a99808cf19851e468e6b500010000000000000000000a",
      assets,
      amounts
    );
    expect(result);
  });
});
