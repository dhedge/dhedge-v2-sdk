// import { Dapp } from "../types";
// import * as utils from "../utils";

import { Dhedge } from "./dhedge";

const myPool = "0x2c7d602cd7c41965cb415ce06e79d2cba2899e24";

// const usdc = "0x9D4Dc547d9c1822aEd5b6e19025894d1B7A54036";
// const usdt = "0x9B8D42B4BFD869f061bc6Be17e0669A9EB7653c6";
// const weth = "0x21d867E9089d07570c682B9186697E2E326CEc8a";
// const tradeAmountUsdc = "1000000";
// const liquidityAmountUsdt = "1000000";

jest.setTimeout(100000);

describe("pool", () => {
  // it("trades 1 USDC into WETH on sushiswap", async () => {
  //   let result;
  //   const dhedge = new Dhedge();
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.trade(Dapp.SUSHISWAP, usdc, weth, tradeAmount);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  it("checks fund composition", async () => {
    let result;
    const dhedge = new Dhedge();
    const pool = await dhedge.loadPool(myPool);
    try {
      result = await pool.getComposition();
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });

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
