import { Dhedge } from "..";
import { testLyra } from "../services/lyra/markets";
import { Network } from "../types";
// import { TEST_POOL } from "./constants";
import { wallet } from "./wallet";

jest.setTimeout(100000);

describe("pool", () => {
  let dhedge: Dhedge;
  beforeAll(async () => {
    dhedge = new Dhedge(wallet, Network.OPTIMISM_KOVAN);
  });

  // it("gets a strike ID", async () => {
  //   let result;
  //   try {
  //     result = await getOptionStrike(
  //       "ETH",
  //       1750,
  //       1660744800,
  //       dhedge.network,
  //       dhedge.signer
  //     );
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("buys a 1500 Call with expiry August 17th", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.tradeLyraOption(
  //       "ETH",
  //       "call",
  //       1660744800,
  //       1500,
  //       "buy",
  //       "1000000000000000000",
  //       "0x2400D0469bfdA59FB0233c3027349D83F1a0f4c8",
  //       "100000000000000000000"
  //     );
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("sells 1 1500 Call with expiry August 17th", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.tradeLyraOption(
  //       "ETH",
  //       "call",
  //       1660744800,
  //       1500,
  //       "sell",
  //       "1000000000000000000",
  //       "0x2400D0469bfdA59FB0233c3027349D83F1a0f4c8",
  //       "0"
  //     );
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  it("it get expiries", async () => {
    let result;
    try {
      result = await dhedge.utils.getLyraOptionExpiries("eth");
      console.log(result);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });

  // it("it get strikes", async () => {
  //   let result;
  //   try {
  //     result = await dhedge.utils.getLyraOptionStrikes("ETH", 1663164000);
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  it("test", async () => {
    let result;
    try {
      result = await testLyra();
    } catch (e) {
      //     console.log(e);
      //   }
      expect(result).not.toBe(null);
    }
  });
});
