/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dhedge } from "..";
import { Dapp, Network } from "../types";
import { TEST_POOL } from "./constants";
//import { getTxOptions } from "./txOptions";

import { wallet } from "./wallet";

let dhedge: Dhedge;
let options: any;
jest.setTimeout(100000);

describe("pool", () => {
  beforeAll(async () => {
    dhedge = new Dhedge(wallet, Network.OPTIMISM);
    //options = await getTxOptions();
    options = { gasLimit: "3000000" };
  });

  it("should swap sETH into sUSD on Synthetix", async () => {
    const pool = await dhedge.loadPool(TEST_POOL);
    const result = await pool.trade(
      Dapp.SYHTHETIX,
      "sETH",
      "sUSD",
      "1000000000000000",
      undefined,
      options
    );

    console.log(result);
    expect(result).not.toBe(null);
  });
});
