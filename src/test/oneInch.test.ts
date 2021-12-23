import { Dhedge, ethers } from "..";
import { Dapp, Network } from "../types";
import { DAI, TEST_POOL, USDC } from "./constants";

import { wallet } from "./wallet";

let dhedge: Dhedge;

jest.setTimeout(100000);

const options = {
  gasLimit: 5000000,
  gasPrice: ethers.utils.parseUnits("35", "gwei")
};

describe("pool", () => {
  beforeAll(() => {
    dhedge = new Dhedge(wallet, Network.POLYGON);
  });

  it("trades 5 DAI into USDC on 1Inch", async () => {
    let result;
    const pool = await dhedge.loadPool(TEST_POOL);
    try {
      result = await pool.trade(
        Dapp.ONEINCH,
        USDC,
        DAI,
        "1000000",
        0.5,
        options
      );
      console.log("1inch trade", result);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });
});
