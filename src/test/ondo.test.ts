/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { Dhedge, Pool } from "..";

import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT } from "./constants";
import { TestingRunParams, testingHelper } from "./utils/testingHelper";

import { getTxOptions } from "./txOptions";
import { allowanceDelta, balanceDelta } from "./utils/token";

import { routerAddress } from "../config";

const testOndo = ({ wallet, network }: TestingRunParams) => {
  const USDC = CONTRACT_ADDRESS[network].USDC;
  const SPYon = "0xfedc5f4a6c38211c1338aa411018dfaf26612c08";

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`pool on ${network}`, () => {
    beforeAll(async () => {
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(
        "0x9f647b85A514b1e60F8E8E956E636a50dA406279"
      );
    });

    it("approves unlimited USDC on Ondo", async () => {
      const tx = await pool.approve(Dapp.ONDO, USDC, MAX_AMOUNT);
      await tx.wait();
      const usdcAllowanceDelta = await allowanceDelta(
        pool.address,
        USDC,
        routerAddress[network]["ondo"]!,
        pool.signer
      );
      expect(usdcAllowanceDelta.gt(0)).toBe(true);
    });

    it("gets gas estimation for 40 USDC into SPYon on Ondo", async () => {
      const gasEstimate = await pool.trade(
        Dapp.ONDO,
        USDC,
        SPYon,
        "40000000",
        0.1,
        await getTxOptions(network),
        true
      );
      expect(gasEstimate.gas.gt(0));
      expect(gasEstimate.minAmountOut).not.toBeNull();
    });

    it("trades 40 USDC into SPYon on Ondo", async () => {
      const tx = await pool.trade(
        Dapp.ONDO,
        USDC,
        SPYon,
        "40000000",
        0.1,
        await getTxOptions(network)
      );
      await tx.wait();
      const spBalanceDelta = await balanceDelta(
        pool.address,
        SPYon,
        pool.signer
      );
      expect(spBalanceDelta.gt(0)).toBe(true);
    });

    it("approves unlimited SPyon on Ondo", async () => {
      const tx = await pool.approve(Dapp.ONDO, SPYon, MAX_AMOUNT);
      await tx.wait();
      const spyonAllowanceDelta = await allowanceDelta(
        pool.address,
        SPYon,
        routerAddress[network]["ondo"]!,
        pool.signer
      );
      expect(spyonAllowanceDelta.gt(0)).toBe(true);
    });

    it("sells SPYon balance on Ondo", async () => {
      const spyonBalance = await pool.utils.getBalance(SPYon, pool.address);
      const tx = await pool.trade(
        Dapp.ONDO,
        SPYon,
        USDC,
        spyonBalance,
        0.1,
        await getTxOptions(network)
      );
      await tx.wait();
      const usdcBalanceDelta = await balanceDelta(
        pool.address,
        USDC,
        pool.signer
      );
      expect(usdcBalanceDelta.gt(0)).toBe(true);
    });
  });
};

testingHelper({
  network: Network.ETHEREUM,
  testingRun: testOndo,
  onFork: false
});
