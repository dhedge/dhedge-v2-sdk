import { Dhedge, Pool } from "..";
import { Network } from "../types";
import { CONTRACT_ADDRESS, TEST_POOL } from "./constants";
import { balanceDelta } from "./utils/token";
import { wallet } from "./wallet";

jest.setTimeout(100000);

const network = Network.OPTIMISM;
const perp = CONTRACT_ADDRESS[network].KWENTA_ETH_PERP_V2;

describe("pool", () => {
  let dhedge: Dhedge;
  let pool: Pool;
  beforeAll(async () => {
    dhedge = new Dhedge(wallet, network);
    pool = await dhedge.loadPool(TEST_POOL[network]);
  });

  it("deposits 100 sUSD margin into ETH future market", async () => {
    const depositAmount = (50 * 1e18).toString();
    await pool.changeFuturesMargin(perp, depositAmount, 2);

    const sUSDBalanceDelta = await balanceDelta(
      pool.address,
      CONTRACT_ADDRESS[network].SUSD,
      pool.signer
    );
    expect(sUSDBalanceDelta.abs().toString()).toBe(depositAmount);
  });

  it("goes long ETH-PERP about 3x leverage", async () => {
    //size 50*3/1600 (margin * leverage  / price)
    const size = (0.09 * 1e18).toString();
    const tx = await pool.changeFuturesPosition(perp, size, 2);
    expect(tx).not.toBe(null);
  });

  it("it closes ETH-PERP position", async () => {
    const tx = await pool.closeFuturesPosition(perp, 2);
    expect(tx).not.toBe(null);
  });

  it("removes entire margin from ETH future market", async () => {
    const margin = await pool.getFuturesMargin(perp);
    await pool.changeFuturesMargin(perp, margin.mul(-1), 2);
    const sUSDBalanceDelta = await balanceDelta(
      pool.address,
      CONTRACT_ADDRESS[network].SUSD,
      pool.signer
    );
    expect(sUSDBalanceDelta.eq(margin));
  });
});
