/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Dhedge, Pool } from "..";
import { routerAddress } from "../config";
import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import { allowanceDelta, balanceDelta } from "./utils/token";

import { wallet } from "./wallet";

// const network = Network.OPTIMISM;
// const network = Network.POLYGON;
const network = Network.ARBITRUM;
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

  it("approves unlimited USDC on Aave Lending pool", async () => {
    await pool.approve(Dapp.AAVEV3, USDC, MAX_AMOUNT);
    const usdcAllowanceDelta = await allowanceDelta(
      pool.address,
      USDC,
      routerAddress[network]["aavev3"]!,
      pool.signer
    );
    await expect(usdcAllowanceDelta.gt(0));
  });

  it("approves unlimited WETH on Aave Lending pool", async () => {
    await pool.approve(Dapp.AAVEV3, WETH, MAX_AMOUNT);
    const wethAllowanceDelta = await allowanceDelta(
      pool.address,
      USDC,
      routerAddress[network]["aavev3"]!,
      pool.signer
    );
    await expect(wethAllowanceDelta.gt(0));
  });

  it("lends 5 USDC into Aave lending pool", async () => {
    await pool.lend(Dapp.AAVEV3, USDC, "5000000");
    const usdcBalanceDelta = await balanceDelta(
      pool.address,
      USDC,
      pool.signer
    );
    expect(usdcBalanceDelta.eq("-5000000"));
  });

  it("it borrows 0.001 WETH from Aave lending pool", async () => {
    await pool.borrow(Dapp.AAVEV3, WETH, "1000000000000000");
    const wethBalanceDelta = await balanceDelta(
      pool.address,
      WETH,
      pool.signer
    );
    expect(wethBalanceDelta.eq("1000000000000000"));
  });

  it("it repays 0.001 WETH to Aave lending pool", async () => {
    await pool.repay(Dapp.AAVEV3, WETH, "1000000000000000");
    const wethBalanceDelta = await balanceDelta(
      pool.address,
      WETH,
      pool.signer
    );
    expect(wethBalanceDelta.eq("-1000000000000000"));
  });

  it("it withdraws 4 USDC from Aave lending pool", async () => {
    await pool.withdrawDeposit(Dapp.AAVEV3, USDC, "4000000");
    const usdcBalanceDelta = await balanceDelta(
      pool.address,
      WETH,
      pool.signer
    );
    expect(usdcBalanceDelta.eq("4000000"));
  });
});
