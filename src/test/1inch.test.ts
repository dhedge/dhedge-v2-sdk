import { Dhedge } from "..";
import { Dapp, Network } from "../types";
import { TEST_POOL, USDC, WBTC } from "./constants";
import { getTxOptions } from "./txOptions";

import { wallet } from "./wallet";

let dhedge: Dhedge;
let options: any;

jest.setTimeout(100000);

describe("pool", () => {
  beforeAll(async () => {
    dhedge = new Dhedge(wallet, Network.OPTIMISM);
    options = await getTxOptions(Network.OPTIMISM);
  });

  //   it("approves unlimited USDC on 1Inch", async () => {
  //     let result;
  //     const pool = await dhedge.loadPool(TEST_POOL);
  //     try {
  //       result = await pool.approve(
  //         Dapp.ONEINCH,
  //         USDC,
  //         ethers.constants.MaxInt256,
  //         options
  //       );
  //       console.log(result);
  //     } catch (e) {
  //       console.log(e);
  //     }
  //     expect(result).not.toBe(null);
  //   });

  it("trades 1 USDC into WBTC on 1Inch", async () => {
    let result;
    const pool = await dhedge.loadPool(TEST_POOL);
    try {
      result = await pool.trade(
        Dapp.ONEINCH,
        USDC,
        WBTC,
        "1000000",
        0.5,
        options
      );
      console.log(result);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });
});
