import { Dhedge, Pool } from "..";
import { Network } from "../types";
import { CONTRACT_ADDRESS, TEST_POOL } from "./constants";
import { balanceDelta } from "./utils/token";
import { wallet } from "./wallet";

jest.setTimeout(100000);

const network = Network.OPTIMISM;
const perp = CONTRACT_ADDRESS[network].KWENTA_ETH_PERP;

describe("pool", () => {
  let dhedge: Dhedge;
  let pool: Pool;
  beforeAll(async () => {
    dhedge = new Dhedge(wallet, network);
    pool = await dhedge.loadPool(TEST_POOL[network]);
  });

  it("deposits 100 sUSD margin into ETH future market", async () => {
    const depositAmount = (1e20).toString();
    await pool.changeFuturesMargin(perp, depositAmount, 1);

    const sUSDBalanceDelta = await balanceDelta(
      pool.address,
      CONTRACT_ADDRESS[network].SUSD,
      pool.signer
    );
    expect(sUSDBalanceDelta.abs().toString()).toBe(depositAmount);
  });

  it("goes short ETH-PERP about 1x leverage", async () => {
    //size 100*1/1500 (margin * leverage  / price)
    const size = (-0.065 * 1e18).toString();
    const tx = await pool.changeFuturesPosition(perp, size, 1);
    expect(tx).not.toBe(null);
  });

  it("it closes ETH-PERP position", async () => {
    const tx = await pool.closeFuturesPosition(perp, 1);
    expect(tx).not.toBe(null);
  });

  it("removes entire margin from ETH future market", async () => {
    const margin = await pool.getFuturesMargin(perp);
    await pool.changeFuturesMargin(perp, margin.mul(-1), 1);
    const sUSDBalanceDelta = await balanceDelta(
      pool.address,
      CONTRACT_ADDRESS[network].SUSD,
      pool.signer
    );
    expect(sUSDBalanceDelta.eq(margin));
  });
});
