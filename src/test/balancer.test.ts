/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dhedge, Pool } from "..";
import { routerAddress } from "../config";
import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import { allowanceDelta, balanceDelta } from "./utils/token";

import { wallet } from "./wallet";

const network = Network.ARBITRUM;
const USDC = CONTRACT_ADDRESS[network].USDC;
const WETH = CONTRACT_ADDRESS[network].WETH;
const WSTETH = CONTRACT_ADDRESS[network].WSTETH;
const BALANCER_POOL = CONTRACT_ADDRESS[network].BALANCER_WSTETH_WETH_POOL;
const BLANCER_GAUGE = CONTRACT_ADDRESS[network].BALANCER_WSTETH_WETH_GAUGE;

let dhedge: Dhedge;
let pool: Pool;
jest.setTimeout(100000);

describe("pool", () => {
  beforeAll(async () => {
    dhedge = new Dhedge(wallet, network);
    pool = await dhedge.loadPool(TEST_POOL[network]);
    await pool.approve(Dapp.ONEINCH, USDC, MAX_AMOUNT);
    await pool.trade(Dapp.ONEINCH, USDC, WETH, "1000000", 0.5);
    await pool.trade(Dapp.ONEINCH, USDC, WSTETH, "1000000", 0.5);
  });

  it("approves unlimited stWETH on Balancer", async () => {
    await pool.approve(Dapp.BALANCER, WSTETH, MAX_AMOUNT);
    const stWETHAllowanceDelta = await allowanceDelta(
      pool.address,
      WSTETH,
      routerAddress[network].balancer!,
      pool.signer
    );
    await expect(stWETHAllowanceDelta.gt(0));
  });

  it("approves unlimited WETH on Balancer", async () => {
    await pool.approve(Dapp.BALANCER, WETH, MAX_AMOUNT);
    const wethAllowanceDelta = await allowanceDelta(
      pool.address,
      WETH,
      routerAddress[network].balancer!,
      pool.signer
    );
    await expect(wethAllowanceDelta.gt(0));
  });

  it("should add liquidity in a Balancer pool", async () => {
    const wstETHBalance = await pool.utils.getBalance(WSTETH, pool.address);
    const wethBalance = await pool.utils.getBalance(WETH, pool.address);
    await pool.joinBalancerPool(
      "0x36bf227d6bac96e2ab1ebb5492ecec69c691943f000200000000000000000316", //wstETH-WETH on Arbitrum
      [WSTETH, WETH],
      [wstETHBalance.toString(), wethBalance.toString()]
    );
    const lpBalanceDelta = await balanceDelta(
      pool.address,
      BALANCER_POOL,
      pool.signer
    );
    expect(lpBalanceDelta.gt(0));
  });

  it("approves unlimited LP Token on Balancer Vault", async () => {
    await pool.approveSpender(BLANCER_GAUGE, BALANCER_POOL, MAX_AMOUNT);
    const gaugeAllowanceDelta = await allowanceDelta(
      pool.address,
      BALANCER_POOL,
      BLANCER_GAUGE,
      pool.signer
    );
    await expect(gaugeAllowanceDelta.gt(0));
  });

  it("stakes LP tokens in Balancer vault", async () => {
    const lpTokenBalance = await pool.utils.getBalance(
      BALANCER_POOL,
      pool.address
    );
    await pool.stakeInGauge(Dapp.BALANCER, BLANCER_GAUGE, lpTokenBalance);
    const lpBalanceDelta = await balanceDelta(
      pool.address,
      BALANCER_POOL,
      pool.signer
    );
    expect(lpBalanceDelta.lt(0));
  });

  it("unstakes LP tokens from Balancer vault", async () => {
    const vaultTokenBalance = await pool.utils.getBalance(
      BLANCER_GAUGE,
      pool.address
    );
    await pool.unstakeFromGauge(BLANCER_GAUGE, vaultTokenBalance);
    const lpBalanceDelta = await balanceDelta(
      pool.address,
      BALANCER_POOL,
      pool.signer
    );
    expect(lpBalanceDelta.gt(0));
  });

  it("should remove liquidity from an Balancer pool ", async () => {
    const lpTokenBalance = await pool.utils.getBalance(
      BALANCER_POOL,
      pool.address
    );
    await pool.approve(Dapp.BALANCER, BALANCER_POOL, MAX_AMOUNT);
    await pool.exitBalancerPool(
      "0x36bf227d6bac96e2ab1ebb5492ecec69c691943f000200000000000000000316",
      [WSTETH, WETH],
      lpTokenBalance
    );
    const wethBalanceDelta = await balanceDelta(
      pool.address,
      CONTRACT_ADDRESS[network].WETH,
      pool.signer
    );
    expect(wethBalanceDelta.gt(0));
  });
});
