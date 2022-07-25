import { Dhedge } from "..";
import { Network } from "../types";
import { TEST_POOL } from "./constants";

import { wallet } from "./wallet";

let dhedge: Dhedge;

jest.setTimeout(100000);

// const options = {
//   gasLimit: 5000000,
//   gasPrice: ethers.utils.parseUnits("35", "gwei")
// };

describe("pool", () => {
  beforeAll(() => {
    dhedge = new Dhedge(wallet, Network.OPTIMISM_KOVAN);
  });

  it("checks fund composition", async () => {
    const pool = await dhedge.loadPool(TEST_POOL);
    const result = await pool.getComposition();
    console.log(result);
    expect(result.length).toBeGreaterThan(0);
  });

  // it("withdraws 1.00002975 fund tokens", async () => {
  //   const pool = await dhedge.loadPool(myPool);
  //   const result = await pool.withdraw("1000029750000000000");
  //   expect(result).toBeGreaterThan(0);
  // });

  // it("approve USDC balance of User for Deposit", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.approveDeposit(usdt, ethers.constants.MaxUint256);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("deposit 0.1 USDC into Pool", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.deposit(usdc, depositAmountUsdc);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("adds LpUSDCWETH/SUSHI/WMATIC to enabled assets", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   const newAssets: AssetEnabled[] = [
  //     { asset: usdc, isDeposit: true },
  //     { asset: weth, isDeposit: true },
  //     { asset: usdt, isDeposit: true },
  //     { asset: amusdc, isDeposit: false },
  //     { asset: lpUsdcUsdt, isDeposit: false }
  //   ];
  //   try {
  //     result = await pool.changeAssets(newAssets);
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("removes all assets except USDC and USDT", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   const newAssets: AssetEnabled[] = [
  //     { asset: usdc, isDeposit: false },
  //     { asset: weth, isDeposit: true }
  //   ];
  //   try {
  //     result = await pool.changeAssets(newAssets);
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("sets a trader account", async () => {
  //   let result;
  //   const newTrader = "0xC52D9a9D9b05a01887871216fF02bA4235e8503d";
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.setTrader(newTrader);
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });
});
