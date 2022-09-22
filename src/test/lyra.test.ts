import { Dhedge } from "..";
import { Network } from "../types";
import { SUSD, TEST_POOL } from "./constants";
import { getTxOptions } from "./txOptions";
import { wallet } from "./wallet";

jest.setTimeout(100000);

describe("pool", () => {
  let dhedge: Dhedge;
  const options = getTxOptions(Network.OPTIMISM);
  beforeAll(async () => {
    dhedge = new Dhedge(wallet, Network.OPTIMISM);
  });

  // it("it gets expiries", async () => {
  //   let result;
  //   try {
  //     result = await dhedge.utils.getLyraOptionExpiries("eth");
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("it gets strikes", async () => {
  //   let result;
  //   try {
  //     result = await dhedge.utils.getLyraOptionStrikes("eth", 1663164000);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("it gets specific strike", async () => {
  //   let result;
  //   try {
  //     result = await dhedge.utils.getLyraOptionStrike("eth", 1663164000, 1700);
  //     console.log(result.market().contractAddresses);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("it gets a quote", async () => {
  //   let result;
  //   try {
  //     const strike = await dhedge.utils.getLyraOptionStrike(
  //       "eth",
  //       1664524800,
  //       2000
  //     );
  //     result = await dhedge.utils.getLyraOptionQuote(
  //       strike,
  //       "call",
  //       "sell",
  //       "100000000000000000000"
  //     );
  //     console.log(result);
  //     console.log(result.premium.toString());
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("buys a 1800 Call with expiry September 14th", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.tradeLyraOption(
  //       "eth",
  //       1663164000,
  //       1800,
  //       "put",
  //       "buy",
  //       "1000000000000000000",
  //       "0x2400D0469bfdA59FB0233c3027349D83F1a0f4c8"
  //     );
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("sells 1 1700 Call with expiry September 14th", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.tradeLyraOption(
  //       "eth",
  //       1663164000,
  //       1700,
  //       "call",
  //       "sell",
  //       "1000000000000000000",
  //       "0x2400D0469bfdA59FB0233c3027349D83F1a0f4c8"
  //     );
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("it gets a Lyra balances", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.getLyraPositions();
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("sells 1 1700 Call with expiry September 14th", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.tradeLyraOption(
  //       "eth",
  //       1665129600,
  //       1600,
  //       "call",
  //       "sell",
  //       "1000000000000000000",
  //       SUSD,
  //       "420000000000000000000",
  //       options
  //     );
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("adds 0.1 1600 Call and 10 sUSD collateral with expiry October 7th to position", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.tradeLyraOption(
  //       "eth",
  //       1665129600,
  //       1600,
  //       "call",
  //       "sell",
  //       "100000000000000000",
  //       SUSD,
  //       "10000000000000000000",
  //       options
  //     );
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  it("closes 1.1 1600 short Call with expiry October 7th", async () => {
    let result;
    const pool = await dhedge.loadPool(TEST_POOL);
    try {
      result = await pool.tradeLyraOption(
        "eth",
        1665129600,
        1600,
        "call",
        "buy",
        "500000000000000000",
        SUSD,
        "420000000000000000000",
        options
      );
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });
});
