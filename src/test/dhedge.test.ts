import { Dhedge } from "..";
import { factoryAddress } from "../config";
import { Network } from "../types";

import { wallet } from "./wallet";

const myPool = "0xbae28251b2a4e621aa7e20538c06dee010bc06de";
// const usdc = "0x9D4Dc547d9c1822aEd5b6e19025894d1B7A54036";
// const weth = "0x21d867E9089d07570c682B9186697E2E326CEc8a";

jest.setTimeout(100000);

let dhedge: Dhedge;

describe("dhedge", () => {
  beforeAll(() => {
    dhedge = new Dhedge(wallet, Network.POLYGON);
  });

  it("loads factory", () => {
    const factory = dhedge.factory;
    expect(factory.address).toBe(factoryAddress[dhedge.network]);
  });

  it("loads a pool by address", async () => {
    const pool = await dhedge.loadPool(myPool);
    expect(pool.poolLogic.address).toBe(myPool);
  });

  // it("create a pool", async () => {
  //   const pool = await dhedge.createPool("Batman", "Gotham Pool", "DHHH", [
  //     [usdc, true],
  //     [weth, true]
  //   ]);
  //   expect(pool.poolLogic.address).toBe(pool.address);
  // });
});
