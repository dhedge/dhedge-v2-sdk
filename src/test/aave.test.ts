import { Dhedge, ethers } from "..";
import { Network } from "../types";
import { AMUSDC, TEST_POOL, VDEBTWETH } from "./constants";

import { wallet } from "./wallet";

let dhedge: Dhedge;

jest.setTimeout(100000);

const options = {
  gasLimit: 5000000,
  gasPrice: ethers.utils.parseUnits("100", "gwei")
};

describe("pool", () => {
  beforeAll(() => {
    dhedge = new Dhedge(wallet, Network.POLYGON);
  });

  // it("withdraws 1 USDC from Aave lending pool", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.withdrawDeposit(
  //       Dapp.AAVE,
  //       weth,
  //       "86567951006165",
  //       options
  //     );
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("borrows 0.0001 WETH from Aave lending pool", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.borrow(Dapp.AAVE, weth, "100000000000000");
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("reapys 0.0001 WETH to Aave lending pool", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.repay(Dapp.AAVE, weth, "100000000000000", options);
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  it("claims rewards from Aave", async () => {
    let result;
    const pool = await dhedge.loadPool(TEST_POOL);
    try {
      result = await pool.harvestAaveRewards([AMUSDC, VDEBTWETH], options);
      console.log(result);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });
});
