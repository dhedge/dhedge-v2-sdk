/* eslint-disable @typescript-eslint/no-non-null-assertion */

/**
 * CowSwap tests require a live chain connection (onFork: false).
 * CowSwap orders are settled off-chain by solvers, so they cannot
 * be tested on a Hardhat fork. Run with a funded wallet and
 * PRIVATE_KEY + POLYGON_URL set in .env.
 *
 * Flow: approve CoW vault relayer → trade
 * Note: estimateGas and onlyGetTxData are not supported for CowSwap
 * because it requires two sequential transactions (submit + preSign).
 */

import { Dhedge, Pool } from "..";

import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import { getTxOptions } from "./txOptions";
import { TestingRunParams, testingHelper } from "./utils/testingHelper";
import { allowanceDelta, balanceDelta } from "./utils/token";

// CoW Protocol Vault Relayer — must be approved before CowSwap trades
const COWSWAP_VAULT_RELAYER = "0xC92E8bdf79f0507f65a392b0ab4667716BFE0110";

const testCowswap = ({ wallet, network }: TestingRunParams) => {
  const USDC = CONTRACT_ADDRESS[network].USDC;
  const WETH = CONTRACT_ADDRESS[network].WETH;

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`[${network}] cowswap tests`, () => {
    beforeAll(async () => {
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);
    });

    it("approves unlimited USDC on Cowswap vault relayer", async () => {
      await pool.approveSpender(
        COWSWAP_VAULT_RELAYER,
        USDC,
        MAX_AMOUNT,
        await getTxOptions(network)
      );
      const usdcAllowanceDelta = await allowanceDelta(
        pool.address,
        USDC,
        COWSWAP_VAULT_RELAYER,
        pool.signer
      );
      expect(usdcAllowanceDelta.gt(0)).toBe(true);
    });

    it("trades 2 USDC into WETH on Cowswap", async () => {
      await pool.trade(
        Dapp.COWSWAP,
        USDC,
        WETH,
        "2000000",
        0.5,
        await getTxOptions(network)
      );
      const wethBalanceDelta = await balanceDelta(
        pool.address,
        WETH,
        pool.signer
      );
      expect(wethBalanceDelta.gt(0)).toBe(true);
    });
  });
};

// CowSwap requires live chain — cannot run on fork
testingHelper({
  network: Network.POLYGON,
  testingRun: testCowswap,
  onFork: false
});
