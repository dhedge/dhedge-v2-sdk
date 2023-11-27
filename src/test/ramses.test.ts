/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dhedge, Pool } from "..";
import { routerAddress } from "../config";
import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import { allowanceDelta, balanceDelta } from "./utils/token";
import { getWalletData } from "./wallet";

const USDC_swETH_Lp = "0xf1a5444a7ed5f24962a118512b076a015b0e6c0b";
const USDC_swETH_Gauge = "0x9765cdaec6395b04737edc22c5b3e7d85677328a";
const network = Network.ARBITRUM;
const USDC = CONTRACT_ADDRESS[network].USDC;
const SWETH = CONTRACT_ADDRESS[network].SWETH;

let dhedge: Dhedge;
let pool: Pool;
jest.setTimeout(100000);

describe("pool", () => {
  beforeAll(async () => {
    const { wallet } = getWalletData(network);
    dhedge = new Dhedge(wallet, network);
    pool = await dhedge.loadPool(TEST_POOL[network]);
    await pool.trade(Dapp.ONEINCH, USDC, SWETH, (5 * 1e6).toString());
  });

  it("approves unlimited USDC and swETH on for Ramses", async () => {
    await pool.approve(Dapp.RAMSES, USDC, MAX_AMOUNT);
    await pool.approve(Dapp.RAMSES, SWETH, MAX_AMOUNT);
    const UsdcAllowanceDelta = await allowanceDelta(
      pool.address,
      USDC,
      routerAddress[network].ramses!,
      pool.signer
    );
    await expect(UsdcAllowanceDelta.gt(0));
  });

  it("adds USDC and swETH to a Ramses volatile pool", async () => {
    const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
    const swethBalance = await pool.utils.getBalance(SWETH, pool.address);
    await pool.addLiquidityV2(
      Dapp.RAMSES,
      USDC,
      SWETH,
      usdcBalance,
      swethBalance,
      false
    );

    const lpTokenDelta = await balanceDelta(
      pool.address,
      USDC_swETH_Lp,
      pool.signer
    );
    expect(lpTokenDelta.gt(0));
  });

  it("should stake USDC-swETH LP in a gauge", async () => {
    const balance = await dhedge.utils.getBalance(USDC_swETH_Lp, pool.address);
    await pool.approveSpender(USDC_swETH_Gauge, USDC_swETH_Lp, MAX_AMOUNT);
    await pool.stakeInGauge(Dapp.RAMSES, USDC_swETH_Gauge, balance);
    const gaugeBalance = await balanceDelta(
      pool.address,
      USDC_swETH_Gauge,
      pool.signer
    );
    expect(gaugeBalance.gt(0));
  });

  // it("should claim rewards from Gauge", async () => {
  //   const tx = await pool.claimFees(Dapp.RAMSES, USDC_swETH_Gauge);
  //   expect(tx).not.toBe(null);
  // });

  it("should unStake USDC-swETH LP from a gauge", async () => {
    const gaugeBalance = await dhedge.utils.getBalance(
      USDC_swETH_Gauge,
      pool.address
    );
    await pool.unstakeFromGauge(USDC_swETH_Gauge, gaugeBalance);
    const lpTokenDelta = await balanceDelta(
      pool.address,
      USDC_swETH_Lp,
      pool.signer
    );
    expect(lpTokenDelta.gt(0));
  });

  it("approves unlimited USDC/swETH LP for Ramses", async () => {
    await pool.approve(Dapp.RAMSES, USDC_swETH_Lp, MAX_AMOUNT);
    const lpAllowanceDelta = await allowanceDelta(
      pool.address,
      USDC_swETH_Lp,
      routerAddress[network].ramses!,
      pool.signer
    );
    expect(lpAllowanceDelta.gt(0));
  });

  it("should remove all liquidity from an existing pool ", async () => {
    const balance = await dhedge.utils.getBalance(USDC_swETH_Lp, pool.address);
    await pool.removeLiquidityV2(Dapp.RAMSES, USDC, SWETH, balance, false);
    const usdcBalanceDelta = await balanceDelta(
      pool.address,
      USDC,
      pool.signer
    );
    const swETHBalanceDelta = await balanceDelta(
      pool.address,
      SWETH,
      pool.signer
    );
    expect(usdcBalanceDelta.gt(0));
    expect(swETHBalanceDelta.gt(0));
  });
});
