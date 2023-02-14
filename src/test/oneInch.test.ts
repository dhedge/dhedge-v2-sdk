/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Dhedge, Pool } from "..";
import { routerAddress } from "../config";
import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import { allowanceDelta, balanceDelta } from "./utils/token";

import { wallet } from "./wallet";

// const network = Network.OPTIMISM;
const network = Network.POLYGON;
const USDC = CONTRACT_ADDRESS[network].USDC;
const WETH = CONTRACT_ADDRESS[network].WETH;

let dhedge: Dhedge;
let pool: Pool;
jest.setTimeout(100000);

describe("pool", () => {
  beforeAll(async () => {
    dhedge = new Dhedge(wallet, network);
    pool = await dhedge.loadPool(TEST_POOL[network]);
  });

  it("approves unlimited USDC on 1Inch", async () => {
    await pool.approve(Dapp.ONEINCH, USDC, MAX_AMOUNT);
    const usdcAllowanceDelta = await allowanceDelta(
      pool.address,
      USDC,
      routerAddress[network]["1inch"]!,
      pool.signer
    );
    await expect(usdcAllowanceDelta.gt(0));
  });

  it("trades 5 USDC into WETH on 1Inch", async () => {
    await pool.trade(Dapp.ONEINCH, USDC, WETH, "5000000", 0.5);
    const wethBalanceDelta = await balanceDelta(
      pool.address,
      WETH,
      pool.signer
    );
    expect(wethBalanceDelta.gt(0));
  });
});
