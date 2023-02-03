/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dhedge, Pool } from "..";
import { routerAddress } from "../config";
import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import { allowanceDelta, balanceDelta } from "./utils/token";

import { wallet } from "./wallet";

const USDC_SUSD_Lp = "0xd16232ad60188b68076a235c65d692090caba155";
const USDC_SUSD_Gauge = "0xb03f52d2db3e758dd49982defd6aeefea9454e80";
const network = Network.OPTIMISM;
const SUSD = CONTRACT_ADDRESS[network].SUSD;
const USDC = CONTRACT_ADDRESS[network].USDC;

let dhedge: Dhedge;
let pool: Pool;
jest.setTimeout(100000);

describe("pool", () => {
  beforeAll(async () => {
    dhedge = new Dhedge(wallet, network);
    pool = await dhedge.loadPool(TEST_POOL[network]);
  });

  it("approves unlimited sUSD and USDC on for Velodrome", async () => {
    await pool.approve(Dapp.VELODROME, SUSD, MAX_AMOUNT);
    await pool.approve(Dapp.VELODROME, USDC, MAX_AMOUNT);
    const UsdcAllowanceDelta = await allowanceDelta(
      pool.address,
      USDC,
      routerAddress[network].velodrome!,
      pool.signer
    );
    await expect(UsdcAllowanceDelta.gt(0));
  });

  it("adds USDC and SUSD to a Velodrome stable pool", async () => {
    await pool.addLiquidityVelodrome(
      USDC,
      SUSD,
      (10 * 1e6).toString(),
      (20 * 1e18).toString(),
      true
    );

    const lpTokenDelta = await balanceDelta(
      pool.address,
      USDC_SUSD_Lp,
      pool.signer
    );
    expect(lpTokenDelta.gt(0));
  });

  it("should stake USDC-sUSD LP in a gauge", async () => {
    const balance = await dhedge.utils.getBalance(USDC_SUSD_Lp, pool.address);
    await pool.approveSpender(USDC_SUSD_Gauge, USDC_SUSD_Lp, MAX_AMOUNT);
    await pool.stakeInGauge(Dapp.VELODROME, USDC_SUSD_Gauge, balance);
    const gaugeBalance = await balanceDelta(
      pool.address,
      USDC_SUSD_Lp,
      pool.signer
    );
    expect(gaugeBalance.gt(0));
  });

  it("should claim rewards from Gauge", async () => {
    const tx = await pool.claimFees(Dapp.VELODROME, USDC_SUSD_Gauge);
    expect(tx).not.toBe(null);
  });

  it("should unStake USDC-sUSD LP from a gauge", async () => {
    const gaugeBalance = await dhedge.utils.getBalance(
      USDC_SUSD_Gauge,
      pool.address
    );
    await pool.unstakeFromGauge(USDC_SUSD_Gauge, gaugeBalance);
    const lpTokenDelta = await balanceDelta(
      pool.address,
      USDC_SUSD_Lp,
      pool.signer
    );
    expect(lpTokenDelta.gt(0));
  });

  it("approves unlimited wETH/stwETH LP for Velodrome", async () => {
    await pool.approve(Dapp.VELODROME, USDC_SUSD_Lp, MAX_AMOUNT);
    const lpAllowanceDelta = await allowanceDelta(
      pool.address,
      USDC_SUSD_Lp,
      routerAddress[network].velodrome!,
      pool.signer
    );
    expect(lpAllowanceDelta.gt(0));
  });

  it("should remove all liquidity from an existing pool ", async () => {
    const balance = await dhedge.utils.getBalance(USDC_SUSD_Lp, pool.address);
    await pool.removeLiquidityVelodrome(USDC, SUSD, balance, true);
    const usdcBalanceDelta = await balanceDelta(
      pool.address,
      USDC,
      pool.signer
    );
    const susdBalanceDelta = await balanceDelta(
      pool.address,
      SUSD,
      pool.signer
    );
    expect(usdcBalanceDelta.gt(0));
    expect(susdBalanceDelta.gt(0));
  });
});
