// import { Dapp } from "../types";

import { AssetEnabled } from "../types";

import { Dhedge } from "./dhedge";

const myPool = "0x82e595a8b41e53CE67F6E3E4a59374A1E1253731";

const usdc = "0x9D4Dc547d9c1822aEd5b6e19025894d1B7A54036";
const weth = "0x21d867E9089d07570c682B9186697E2E326CEc8a";
//const usdt = "0x9B8D42B4BFD869f061bc6Be17e0669A9EB7653c6";

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

  // it("checks fund composition", async () => {
  //   let result: any;
  //   const dhedge = new Dhedge();
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.getComposition();
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("adds USDT to enabled assets", async () => {
  //   let result: any;
  //   const dhedge = new Dhedge();
  //   const pool = await dhedge.loadPool(myPool);
  //   const newAssets: AssetEnabled[] = [
  //     { asset: usdc, isDeposit: true },
  //     { asset: weth, isDeposit: true },
  //     { asset: usdt, isDeposit: true }
  //   ];
  //   try {
  //     result = await pool.changeAssets(newAssets);
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  it("removes USDT from enabled assets and removes deposit from USDC", async () => {
    let result: any;
    const dhedge = new Dhedge();
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
});
