import { Dhedge } from "..";
import { Network } from "../types";
import { KWENTA_ETH_PERP_V2, SUSD, TEST_POOL } from "./constants";
import { getTxOptions } from "./txOptions";
import { wallet } from "./wallet";

jest.setTimeout(100000);

describe("pool", () => {
  let dhedge: Dhedge;
  const options = getTxOptions(Network.OPTIMISM);
  beforeAll(async () => {
    dhedge = new Dhedge(wallet, Network.OPTIMISM);
  });

  it("deposits 100 sUSD margin into ETH future market", async () => {
    const depositAmount = (1e20).toString();
    const pool = await dhedge.loadPool(TEST_POOL);
    const sUSDBalance = await pool.utils.getBalance(SUSD, pool.address);
    const result = await pool.changeFuturesMargin(
      KWENTA_ETH_PERP_V2,
      depositAmount,
      2,
      options
    );

    await result.wait(2);
    const sUSDBalanceAfter = await pool.utils.getBalance(SUSD, pool.address);
    expect(sUSDBalance.sub(sUSDBalanceAfter).toString()).toBe(depositAmount);
  });

  it("goes long ETH-PERP about 2x leverage", async () => {
    //size 100*2/1500 (margin * leverage  / price)
    const size = (0.13 * 1e18).toString();
    const pool = await dhedge.loadPool(TEST_POOL);
    const result = await pool.changeFuturesPosition(
      KWENTA_ETH_PERP_V2,
      size,
      2,
      options
    );

    expect(result).not.toBe(null);
  });

  it("it closes ETH-PERP position", async () => {
    const pool = await dhedge.loadPool(TEST_POOL);
    const result = await pool.closeFuturesPosition(
      KWENTA_ETH_PERP_V2,
      2,
      options
    );
    expect(result).not.toBe(null);
  });

  it("removes entire margin from ETH future market", async () => {
    const pool = await dhedge.loadPool(TEST_POOL);
    const sUSDBalance = await pool.utils.getBalance(SUSD, pool.address);
    const margin = await pool.getFuturesMargin(KWENTA_ETH_PERP_V2);
    const result = await pool.changeFuturesMargin(
      KWENTA_ETH_PERP_V2,
      margin.mul(-1),
      2,
      options
    );

    await result.wait(2);
    const sUSDBalanceAfter = await pool.utils.getBalance(SUSD, pool.address);
    expect(sUSDBalanceAfter.sub(sUSDBalance).toString()).toBe(
      margin.toString()
    );
  });
});
