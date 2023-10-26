//import { ethers } from "ethers";
import { Dhedge, Pool } from "..";
import { Network } from "../types";
import { CONTRACT_ADDRESS, TEST_POOL } from "./constants";
import {
  TestingRunParams,
  beforeAfterReset,
  testingHelper
} from "./utils/testingHelper";

// const myPool = "0xe3528a438b94e64669def9b875c381c46ef713bf";

// const usdt = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";

// const lpUsdcWeth = "0x34965ba0ac2451A34a0471F04CCa3F990b8dea27";

const testUtils = ({ wallet, network, provider }: TestingRunParams) => {
  let dhedge: Dhedge;
  let pool: Pool;
  const usdc = CONTRACT_ADDRESS[network].USDC;
  const weth = CONTRACT_ADDRESS[network].WETH;
  const wbtc = CONTRACT_ADDRESS[network].WBTC;
  // const usdt = CONTRACT_ADDRESS[network].USDT;

  jest.setTimeout(100000);

  describe(`utils on ${network}`, () => {
    beforeAll(async () => {
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);
    });
    beforeAfterReset({ beforeAll, afterAll, provider });

    // it("gets lp ratio of the USDT/USDC pool", async () => {
    //   const result = await dhedge.utils.getLpReserves(Dapp.SUSHISWAP, usdc, usdt);
    //   expect(Number(result.assetA) / Number(result.assetB)).toBeGreaterThan(0.9);
    // });

    // it("gets pool id of sushi LP pool for USDC/WETH", async () => {
    //   const result = await dhedge.utils.getLpPoolId(Dapp.SUSHISWAP, lpUsdcWeth);
    //   expect(result).toBe(1);
    // });

    // it("gets USDC balance of a pool", async () => {
    //   const result = await dhedge.utils.getBalance(usdc, myPool);
    //   expect(result.gt(0));
    // });
    // it("gets minumum amount out of WETH for 1 USDC", async () => {
    //   const result = await dhedge.utils.getMinAmountOut(
    //     Dapp.SUSHISWAP,
    //     usdc,
    //     weth,
    //     "1000000",
    //     0.5
    //   );
    //   expect(result.gt(0));
    // });

    it("gets Balancer pool tx data", async () => {
      // pool = await dhedge.loadPool(pool);
      const assets = [wbtc, usdc, weth];
      const amounts = ["0", "1000000", "0"];
      const result = await dhedge.utils.getBalancerJoinPoolTx(
        pool,
        "0x03cd191f589d12b0582a99808cf19851e468e6b500010000000000000000000a",
        assets,
        amounts
      );
      expect(result);
    });
  });
};

testingHelper({
  network: Network.POLYGON,
  testingRun: testUtils
});

testingHelper({
  network: Network.OPTIMISM,
  testingRun: testUtils
});
