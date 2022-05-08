import { Dhedge } from "..";
import { Dapp, Network } from "../types";
import { DAI, TEST_POOL, USDC } from "./constants";

import { wallet } from "./wallet";

let dhedge: Dhedge;

jest.setTimeout(100000);

// const options = {
//   gasLimit: 5000000,
//   gasPrice: ethers.utils.parseUnits("35", "gwei")
// };

describe("pool", () => {
  beforeAll(() => {
    dhedge = new Dhedge(wallet, Network.OPTIMISM);
  });

  // it("approves unlimited DAI on 1Inch", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.approve(
  //       Dapp.ONEINCH,
  //       DAI,
  //       ethers.constants.MaxInt256
  //     );
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  it("trades 1 entire DAI balance into USDC on 1Inch", async () => {
    let result;
    const pool = await dhedge.loadPool(TEST_POOL);
    try {
      const balance = await dhedge.utils.getBalance(DAI, pool.address);
      result = await pool.trade(Dapp.ONEINCH, DAI, USDC, balance, 0.5);
      console.log("1inch trade", result);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });
});
