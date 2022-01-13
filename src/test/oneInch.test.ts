import { Dhedge, ethers } from "..";
import { Dapp, Network } from "../types";
import { TEST_POOL, USDC, WETH } from "./constants";

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

  // it("approves unlimited USDC on 1Inch", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.approve(
  //       Dapp.ONEINCH,
  //       USDC,
  //       ethers.constants.MaxInt256,
  //       options
  //     );
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  it("trades 1 USDC into WETH on 1Inch", async () => {
    let result;
    const pool = await dhedge.loadPool(TEST_POOL);
    try {
      result = await pool.trade(
        Dapp.ONEINCH,
        USDC,
        WETH,
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
