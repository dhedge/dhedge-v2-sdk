import { Dhedge } from "..";
import { Dapp, Network } from "../types";
import { TEST_POOL, WETH } from "./constants";

import { wallet } from "./wallet";

let dhedge: Dhedge;

jest.setTimeout(100000);

// const options = {
//   gasLimit: 5000000,
//   gasPrice: ethers.utils.parseUnits("100", "gwei")
// };

describe("pool", () => {
  beforeAll(() => {
    dhedge = new Dhedge(wallet, Network.OPTIMISM);
  });

  // it("approves USDC to Aave", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.approve(
  //       Dapp.AAVEV3,
  //       USDC,
  //       ethers.constants.MaxUint256
  //     );
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

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

  it("borrows 0.001 WETH from Aave lending pool", async () => {
    let result;
    const pool = await dhedge.loadPool(TEST_POOL);
    try {
      result = await pool.borrow(Dapp.AAVEV3, WETH, "1000000000000000");
      console.log(result);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });

  // it("reapys 1USDC to Aave lending pool", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.repay(Dapp.AAVEV3, USDC, "1380000");
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("claims rewards from Aave", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.harvestAaveRewards([AMUSDC, VDEBTWETH], options);
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("lends USDC to Aave", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     const balance = await dhedge.utils.getBalance(WETH, pool.address);
  //     result = await pool.lend(Dapp.AAVEV3, WETH, balance, 196);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });
});
