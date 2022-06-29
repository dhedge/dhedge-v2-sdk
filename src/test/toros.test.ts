import { Dhedge, ethers } from "..";
import {
  getEasySwapperDepositQuote,
  getEasySwapperWithdrawalQuote,
  getPoolDepositAsset
} from "../services/toros/easySwapper";
import { Dapp, Network } from "../types";
import { BTCBEAR2X, ETHBULL3X, TEST_POOL, USDC, WBTC } from "./constants";
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

  it("gets Deposit Quote for ETHBULL3X invest with USDC", async () => {
    let result;
    const pool = await dhedge.loadPool(ETHBULL3X);
    try {
      const depositAsset = await getPoolDepositAsset(pool, ETHBULL3X);
      if (!depositAsset) throw new Error("no deposit assets");

      result = await getEasySwapperDepositQuote(
        pool,
        pool.address,
        USDC,
        depositAsset,
        ethers.BigNumber.from("100000000")
      );
      console.log("deposit quote", result.toString());
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });

  it("gets withdrawal Quote for BTCBEAR2X sell for WBTC", async () => {
    let result;
    const pool = await dhedge.loadPool(BTCBEAR2X);
    try {
      result = await getEasySwapperWithdrawalQuote(
        pool,
        pool.address,
        WBTC,
        ethers.BigNumber.from("9751590099507644982205")
      );
      console.log("withdrawal quote", result.toString());
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });

  it("approves unlimited ETHBULL3X on Easyswapper", async () => {
    let result;
    const pool = await dhedge.loadPool(TEST_POOL);
    try {
      result = await pool.approve(
        Dapp.TOROS,
        ETHBULL3X,
        ethers.constants.MaxInt256,
        options
      );
      console.log(result);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });

  // it("buys ETHBULL3X for 1 USDC", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.trade(
  //       Dapp.TOROS,
  //       USDC,
  //       ETHBULL3X,
  //       "1000000",
  //       0.5,
  //       options
  //     );
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  it("sells ETHBULL3X balance for USDC", async () => {
    let result;
    const pool = await dhedge.loadPool(TEST_POOL);
    const balance = await pool.utils.getBalance(ETHBULL3X, pool.address);
    try {
      result = await pool.trade(
        Dapp.TOROS,
        ETHBULL3X,
        USDC,
        balance,
        3,
        options
      );
      console.log(result);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });
});
