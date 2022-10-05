import { Dhedge } from "..";
import { Dapp, Network } from "../types";
import { TEST_POOL, WMATIC } from "./constants";
import { getTxOptions } from "./txOptions";

import { wallet } from "./wallet";

let dhedge: Dhedge;
let options: any;

jest.setTimeout(100000);

describe("pool", () => {
  beforeAll(async () => {
    dhedge = new Dhedge(wallet, Network.POLYGON);
    options = await getTxOptions(Network.POLYGON);
  });

  // it("approves unlimited WMATIC on 1Inch", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.approve(
  //       Dapp.ONEINCH,
  //       WMATIC,
  //       ethers.constants.MaxInt256,
  //       options
  //     );
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  it("trades 1 USDC into WBTC on 1Inch", async () => {
    let result;
    const pool = await dhedge.loadPool(TEST_POOL);
    try {
      result = await pool.trade(
        Dapp.ONEINCH,
        WMATIC,
        "0x3A58a54C066FdC0f2D55FC9C89F0415C92eBf3C4",
        "250000000000000000",
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
