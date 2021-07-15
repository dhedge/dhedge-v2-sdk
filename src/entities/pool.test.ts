// import { Dapp } from "../types";

import { Dhedge } from "./dhedge";

const myPool = "0x2c7d602cd7c41965cb415ce06e79d2cba2899e24";

// const usdc = "0x9D4Dc547d9c1822aEd5b6e19025894d1B7A54036";
// const weth = "0x21d867E9089d07570c682B9186697E2E326CEc8a";
// const tradeAmount = "1000000";

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
      console.log(result);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });
});
