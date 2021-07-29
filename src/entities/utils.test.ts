import { ethers } from "ethers";

import { privateKey, providerUrl } from "../secrets";
import { Dapp, Network } from "../types";

import { Dhedge } from "./index";

const myPool = "0xd63aA0Dce2311670608f1AB0667E43612F73340e";

const usdt = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const usdc = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174";
const lpUsdcWeth = "0x34965ba0ac2451A34a0471F04CCa3F990b8dea27";

const provider = new ethers.providers.JsonRpcProvider(providerUrl);
const wallet = new ethers.Wallet(privateKey, provider);
let dhedge: Dhedge;

jest.setTimeout(100000);

describe("utils", () => {
  beforeAll(() => {
    dhedge = new Dhedge(wallet, Network.POLYGON);
  });

  it("calculates minumum amount out when trading 1 USDC to USDT pool", async () => {
    const result = await dhedge.utils.getMinAmountOut(
      Dapp.SUSHISWAP,
      usdc,
      usdt,
      "1000000",
      0.05
    );
    expect(Number(result)).toBeGreaterThan(980000);
    expect(Number(result)).toBeLessThan(1020000);
  });

  it("gets lp ratio of the USDT/USDC pool", async () => {
    const result = await dhedge.utils.getLpReserves(Dapp.SUSHISWAP, usdc, usdt);
    expect(Number(result.assetA) / Number(result.assetB)).toBeGreaterThan(0.9);
  });

  it("gets pool id of sushi LP pool for USDC/WETH", async () => {
    const result = await dhedge.utils.getLpPoolId(Dapp.SUSHISWAP, lpUsdcWeth);
    expect(result).toBe(1);
  });

  it("gets USDC balance of a pool", async () => {
    const result = await dhedge.utils.getBalance(usdc, myPool);
    expect(result.gt(0));
  });
});
