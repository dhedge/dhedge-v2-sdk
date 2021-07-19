//import { ethers } from "ethers";

import { Dhedge } from "../entities";
import { Dapp } from "../types";

import * as utils from "./utils";

// const usdt = "0x9B8D42B4BFD869f061bc6Be17e0669A9EB7653c6";
// const weth = "0x21d867E9089d07570c682B9186697E2E326CEc8a";
const lpUsdcWeth = "0x34965ba0ac2451A34a0471F04CCa3F990b8dea27";
// const tradeAmountUsdt = "1000000";
// const tradeAmountWeth = "1000000000000000000";

jest.setTimeout(100000);

describe("utils", () => {
  //   const checkAlmostSame = (a: string, b: string): void => {
  //     expect(
  //       ethers.BigNumber.from(a).gt(
  //         ethers.BigNumber.from(b)
  //           .mul(99)
  //           .div(100)
  //       )
  //     ).toBe(true);

  //     expect(
  //       ethers.BigNumber.from(a).lt(
  //         ethers.BigNumber.from(b)
  //           .mul(101)
  //           .div(100)
  //       )
  //     ).toBe(true);
  //   };

  //   it("calculates lp amount of WETH given 1 USDT to the USDT/WETH pool", async () => {
  //     const dhedge = new Dhedge();
  //     const result = await utils.calculateLpAmount(
  //       Dapp.SUSHISWAP,
  //       usdt,
  //       weth,
  //       tradeAmountUsdt,
  //       dhedge.signer
  //     );
  //     checkAlmostSame(result, "385356217619582");
  //   });

  //   it("calculates lp amount of USDT given 1 WETH to the USDT/WETH pool", async () => {
  //     const dhedge = new Dhedge();
  //     const result = await utils.calculateLpAmount(
  //       Dapp.SUSHISWAP,
  //       weth,
  //       usdt,
  //       tradeAmountWeth,
  //       dhedge.signer
  //     );
  //     checkAlmostSame(result, "2595001596");
  //   });

  it("gets pool Id of sushi LP pool for USDC/WETH pool", async () => {
    const dhedge = new Dhedge();
    const result = await utils.getLpPoolId(
      Dapp.SUSHISWAP,
      lpUsdcWeth,
      dhedge.signer
    );
    expect(result).toBe(1);
  });
});
