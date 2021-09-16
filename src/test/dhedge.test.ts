import { Dhedge } from "..";
import { factoryAddress } from "../config";
import { Network } from "../types";

import { wallet } from "./wallet";

const myPool = "0x3deeba9ca29e2dd98d32eed8dd559dac55014615";
// const usdc = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
// const weth = "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619";

// const options = {
//   gasPrice: ethers.utils.parseUnits("40", "gwei")
// };

jest.setTimeout(900000);

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
  //   const pool = await dhedge.createPool(
  //     "Batman",
  //     "Gotham Pool",
  //     "DHHH",
  //     [
  //       [usdc, true],
  //       [weth, true]
  //     ],
  //     25,
  //     options
  //   );
  //   console.log(pool.address);
  //   expect(pool.poolLogic.address).toBe(pool.address);
  // });
});
