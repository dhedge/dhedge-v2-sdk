import { Dhedge, Pool } from "..";
import { Network } from "../types";
import { CONTRACT_ADDRESS, TEST_POOL } from "./constants";
import { getDelayedOrders } from "./utils/futures";
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

  it("deposits 50 sUSD margin into ETH future market", async () => {
    const depositAmount = (50 * 1e18).toString();
    await pool.changeFuturesMargin(perp, depositAmount);

    const sUSDBalanceDelta = await balanceDelta(
      pool.address,
      CONTRACT_ADDRESS[network].SUSD,
      pool.signer
    );
    expect(sUSDBalanceDelta.abs().toString()).toBe(depositAmount);
  });

  it("goes long ETH-PERP about 2x leverage", async () => {
    //size 50*2/2000 (margin * leverage  / price)
    const size = (0.05 * 1e18).toString();
    await pool.changeFuturesPosition(perp, size);
    const orders = await getDelayedOrders(perp, pool);
    expect(orders.length).toBeGreaterThan(0);
  });

  it("removes 20 sUSD margin from ETH future market", async () => {
    await getDelayedOrders(perp, pool);
    await pool.changeFuturesMargin(perp, (-20 * 1e18).toString());
    const sUSDBalanceDelta = await balanceDelta(
      pool.address,
      CONTRACT_ADDRESS[network].SUSD,
      pool.signer
    );
    expect(sUSDBalanceDelta.gt(0));
  });
});
