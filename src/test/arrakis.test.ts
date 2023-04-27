/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dhedge, Pool } from "..";
import { routerAddress } from "../config";
import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import { allowanceDelta, balanceDelta } from "./utils/token";

import { wallet } from "./wallet";

//const network = Network.OPTIMISM;
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
    await pool.approve(Dapp.ONEINCH, USDC, MAX_AMOUNT);
    await pool.trade(Dapp.ONEINCH, USDC, WETH, "1000000", 0.5);
  });

  it("approves unlimited USDC on Arrakis", async () => {
    await pool.approve(Dapp.ARRAKIS, USDC, MAX_AMOUNT);
    const usdcAllowanceDelta = await allowanceDelta(
      pool.address,
      USDC,
      routerAddress[network].arrakis!,
      pool.signer
    );
    await expect(usdcAllowanceDelta.gt(0));
  });

  it("approves unlimited WETH on Arrakis", async () => {
    await pool.approve(Dapp.ARRAKIS, WETH, MAX_AMOUNT);
    const wethAllowanceDelta = await allowanceDelta(
      pool.address,
      USDC,
      routerAddress[network].arrakis!,
      pool.signer
    );
    await expect(wethAllowanceDelta.gt(0));
  });

  it("should add liquidity and stake in an WETH/USDC Arrakis pool", async () => {
    const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
    const wethBalance = await pool.utils.getBalance(WETH, pool.address);
    await pool.increaseLiquidity(
      Dapp.ARRAKIS,
      CONTRACT_ADDRESS[network].ARRAKIS_USDC_WETH_GAUGE,
      usdcBalance,
      wethBalance
    );
    const lpBalanceDelta = await balanceDelta(
      pool.address,
      CONTRACT_ADDRESS[network].ARRAKIS_USDC_WETH_LP,
      pool.signer
    );
    expect(lpBalanceDelta.gt(0));
  });

  it("approves unlimited LP staking Token before on Arrakis", async () => {
    await pool.approve(
      Dapp.ARRAKIS,
      CONTRACT_ADDRESS[network].ARRAKIS_USDC_WETH_GAUGE,
      MAX_AMOUNT
    );
    const gaugeAllowanceDelta = await allowanceDelta(
      pool.address,
      CONTRACT_ADDRESS[network].ARRAKIS_USDC_WETH_GAUGE,
      routerAddress[network].arrakis!,
      pool.signer
    );
    await expect(gaugeAllowanceDelta.gt(0));
  });

  it("should remove liquidity from an existing pool ", async () => {
    await pool.decreaseLiquidity(
      Dapp.ARRAKIS,
      CONTRACT_ADDRESS[network].ARRAKIS_USDC_WETH_GAUGE,
      100
    );
    const wethBalanceDelta = await balanceDelta(
      pool.address,
      CONTRACT_ADDRESS[network].WETH,
      pool.signer
    );
    expect(wethBalanceDelta.gt(0));
  });
});
