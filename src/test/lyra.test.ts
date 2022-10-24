import { Dhedge } from "..";
import { Network } from "../types";
import { utils } from "ethers";
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

  it("buys 0.1 1400 calls with expiry October 28th", async () => {
    let result;
    const pool = await dhedge.loadPool(TEST_POOL);
    try {
      result = await pool.tradeLyraOption(
        "eth",
        1666944000,
        1400,
        "call",
        "buy",
        utils.parseEther("0.1"),
        SUSD
      );
    } catch (e) {
      console.log(e);
    }
    result.wait(1);
    const positions = await getPositions(pool);
    console.log(positions);
    expect(positions.length > 0);
  });

  it("adds 0.05 1400 calls with expiry October 28th", async () => {
    let result;
    const pool = await dhedge.loadPool(TEST_POOL);
    try {
      result = await pool.tradeLyraOption(
        "eth",
        1666944000,
        1400,
        "call",
        "buy",
        utils.parseEther("0.05"),
        SUSD,
        "0",
        false,
        options
      );
    } catch (e) {
      console.log(e);
    }
    result.wait(1);
    const positions = await pool.getLyraPositions("eth");
    expect(utils.formatEther(positions[0].amount)).toBe("0.15");
  });

  it("sells 0.1 1300 Covered Call with expiry October 28th", async () => {
    let result;
    const pool = await dhedge.loadPool(TEST_POOL);
    try {
      result = await pool.tradeLyraOption(
        "eth",
        1666944000,
        1300,
        "call",
        "sell",
        utils.parseEther("0.1"),
        SUSD,
        utils.parseEther("0.1"),
        true,
        options
      );
    } catch (e) {
      console.log(e);
    }
    result.wait(1);
    const positions = await pool.getLyraPositions("eth");
    const cCall = positions.find(e => e.optionType === 2);
    expect(cCall).not.toBe(undefined);
  });

  it("adds 0.05 1300 Covered Call with expiry October 28th", async () => {
    let result;
    const pool = await dhedge.loadPool(TEST_POOL);
    try {
      result = await pool.tradeLyraOption(
        "eth",
        1666944000,
        1300,
        "call",
        "sell",
        utils.parseEther("0.05"),
        SUSD,
        utils.parseEther("0.05"),
        true,
        options
      );
    } catch (e) {
      console.log(e);
    }
    result.wait(1);
    const positions = await pool.getLyraPositions("eth");
    const cCall = positions.find(e => e.optionType === 2);
    expect(cCall);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(utils.formatEther(cCall!.amount)).toBe("0.15");
  });

  it("closes all 0.15 1300 Covered Call with expiry October 28th", async () => {
    let result;
    const pool = await dhedge.loadPool(TEST_POOL);
    try {
      result = await pool.tradeLyraOption(
        "eth",
        1666944000,
        1300,
        "call",
        "buy",
        utils.parseEther("0.15"),
        SUSD,
        utils.parseEther("0.15"),
        true,
        options
      );
    } catch (e) {
      console.log(e);
    }
    result.wait(1);
    const positions = await pool.getLyraPositions("eth");
    const cCall = positions.find(e => e.optionType === 2 && e.state === 1);
    expect(cCall).toBe(undefined);
  });

  it("closes all 0.15 1400 Calls with expiry October 28th", async () => {
    let result;
    const pool = await dhedge.loadPool(TEST_POOL);
    try {
      result = await pool.tradeLyraOption(
        "eth",
        1666944000,
        1400,
        "call",
        "sell",
        utils.parseEther("0.15"),
        SUSD,
        "0",
        false,
        options
      );
    } catch (e) {
      console.log(e);
    }
    result.wait(1);
    const positions = await pool.getLyraPositions("eth");
    const call = positions.find(e => e.optionType === 0 && e.state === 1);
    expect(call).toBe(undefined);
  });
});
