/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dhedge } from "..";
import { Dapp, Network } from "../types";
import { ARRAKIS_USDC_WETH_GAUGE, TEST_POOL } from "./constants";
import { getTxOptions } from "./txOptions";
//import { getTxOptions } from "./txOptions";

import { wallet } from "./wallet";

let dhedge: Dhedge;
let options: any;
jest.setTimeout(100000);

describe("pool", () => {
  beforeAll(async () => {
    dhedge = new Dhedge(wallet, Network.POLYGON);
    options = await getTxOptions(Network.POLYGON);
  });

  // it("approves unlimited WETH on  Arrakis", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.approve(
  //       Dapp.ARRAKIS,
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

  // it("should add liquidity and stake in an WETH/USDC Arrakis pool", async () => {
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   const result = await pool.increaseLiquidity(
  //     Dapp.ARRAKIS,
  //     "0x33d1ad9Cd88A509397CD924C2d7613C285602C20",
  //     "776000",
  //     "470000000000000",
  //     options
  //   );
  //   console.log("result", result);
  //   expect(result).not.toBe(null);
  // });

  // it("approves unlimited LP staking Token before on  Arrakis", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.approve(
  //       Dapp.ARRAKIS,
  //       ARRAKIS_USDC_WETH_GAUGE,
  //       ethers.constants.MaxInt256,
  //       options
  //     );
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  it("should remove liquidity from an existing pool ", async () => {
    const pool = await dhedge.loadPool(TEST_POOL);
    const result = await pool.decreaseLiquidity(
      Dapp.ARRAKIS,
      ARRAKIS_USDC_WETH_GAUGE,
      50.6576575755,
      options
    );
    console.log("result", result);
    expect(result).not.toBe(null);
  });

  // it("should claim fees an existing pool", async () => {
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   const result = await pool.claimFees(
  //     Dapp.ARRAKIS,
  //     ARRAKIS_USDC_WETH_GAUGE,
  //     options
  //   );
  //   console.log("result", result);
  //   expect(result).not.toBe(null);
  // });
});
