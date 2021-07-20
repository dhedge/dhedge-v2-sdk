import { ethers } from "ethers";

import { Dapp } from "../types";

import { Dhedge } from "./index";

const weth = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
const usdt = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const lpUsdcWeth = "0x34965ba0ac2451A34a0471F04CCa3F990b8dea27";
const tradeAmountUsdt = "1000000";
const tradeAmountWeth = "1000000000000000000";

jest.setTimeout(100000);

describe("utils", () => {
  const checkAlmostSame = (a: string, b: string): void => {
    expect(
      ethers.BigNumber.from(a).gt(
        ethers.BigNumber.from(b)
          .mul(99)
          .div(100)
      )
    ).toBe(true);

    expect(
      ethers.BigNumber.from(a).lt(
        ethers.BigNumber.from(b)
          .mul(101)
          .div(100)
      )
    ).toBe(true);
  };

  it("calculates lp amount of WETH given 1 USDT to the USDT/WETH pool", async () => {
    const dhedge = new Dhedge();
    const result = await dhedge.utils.calculateLpAmount(
      Dapp.SUSHISWAP,
      usdt,
      weth,
      tradeAmountUsdt
    );
    checkAlmostSame(result, "545285106430725");
  });

  it("calculates lp amount of USDT given 1 WETH to the USDT/WETH pool", async () => {
    const dhedge = new Dhedge();
    const result = await dhedge.utils.calculateLpAmount(
      Dapp.SUSHISWAP,
      weth,
      usdt,
      tradeAmountWeth
    );
    checkAlmostSame(result, "1833903013");
  });

  it("gets pool Id of sushi LP pool for USDC/WETH pool", async () => {
    const dhedge = new Dhedge();
    const result = await dhedge.utils.getLpPoolId(Dapp.SUSHISWAP, lpUsdcWeth);
    expect(result).toBe(1);
  });
});
