import { Dhedge } from "..";
import { Network } from "../types";
import { STMATIC, TEST_POOL, WMATIC } from "./constants";
import { getTxOptions } from "./txOptions";

import { wallet } from "./wallet";

let dhedge: Dhedge;
let options: any;

jest.setTimeout(100000);

describe("pool", () => {
  beforeAll(async () => {
    dhedge = new Dhedge(wallet, Network.POLYGON);
    options = await getTxOptions();
  });

  // it("approves unlimited USDC on Balancer", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.approve(
  //       Dapp.BALANCER,
  //       USDC,
  //       ethers.constants.MaxInt256,
  //       options
  //     );
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("trades 2 USDC into SUSHI on Balancer", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   try {
  //     result = await pool.trade(
  //       Dapp.BALANCER,
  //       usdc,
  //       sushi,
  //       "2000000",
  //       0.5,
  //       options
  //     );
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("adds 1 USDC to a USDC/TUSD/DAI/USDT balancer pool", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   const assets = [USDC, TUSD, DAI, USDT];
  //   const amounts = ["1000000", "0", "0", "0"];
  //   try {
  //     result = await pool.joinBalancerPool(
  //       "0x0d34e5dd4d8f043557145598e4e2dc286b35fd4f000000000000000000000068",
  //       assets,
  //       amounts,
  //       options
  //     );
  //     console.log("result", result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("exits entire balance of WBTC/USDC/WETH balancer pool", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(myPool);
  //   const assets = [wbtc, usdc, weth];
  //   const amount = await dhedge.utils.getBalance(
  //     "0x03cd191f589d12b0582a99808cf19851e468e6b5",
  //     pool.address
  //   );
  //   try {
  //     result = await pool.exitBalancerPool(
  //       "0x03cd191f589d12b0582a99808cf19851e468e6b500010000000000000000000a",
  //       assets,
  //       amount,
  //       options
  //     );
  //     console.log("result", result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("claims balancer rewards", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.harvestBalancerRewards(options);
  //     console.log("result", result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  //   it("adds 5 WMATIC to a WMATIC/stMATIC balancer pool", async () => {
  //     let result;
  //     const pool = await dhedge.loadPool(TEST_POOL);
  //     const assets = [WMATIC, STMATIC];
  //     const amounts = ["5000000000000000000", "0"];
  //     try {
  //       result = await pool.joinBalancerPool(
  //         "0xaf5e0b5425de1f5a630a8cb5aa9d97b8141c908d000200000000000000000366",
  //         assets,
  //         amounts,
  //         options
  //       );
  //       console.log("result", result);
  //     } catch (e) {
  //       console.log(e);
  //     }
  //     expect(result).not.toBe(null);
  //   });

  // it("allows unlimited WMATIC-stMATIC LP on gauge", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.approveSpender(
  //       "0x9928340f9E1aaAd7dF1D95E27bd9A5c715202a56",
  //       WMATIC_STMATIC_LP,
  //       ethers.constants.MaxUint256,
  //       options
  //     );
  //     console.log("result", result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("stakes WMATIC-stMATIC LP in gauge", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.stakeInGauge(
  //       "0x9928340f9E1aaAd7dF1D95E27bd9A5c715202a56",
  //       "4978534455005333156",
  //       options
  //     );
  //     console.log("result", result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("claim fess pf staked WMATIC-stMATIC LP in gauge", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.claimFees(
  //       Dapp.BALANCER,
  //       "0x9928340f9E1aaAd7dF1D95E27bd9A5c715202a56",
  //       options
  //     );
  //     console.log("result", result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  // it("unstakes WMATIC-stMATIC LP from gauge", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.unstakeFromGauge(
  //       "0x9928340f9E1aaAd7dF1D95E27bd9A5c715202a56",
  //       "4978534455005333156",
  //       options
  //     );
  //     console.log("result", result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  it("exits from WMATIC-stMATIC LP into WMATIC", async () => {
    let result;
    const pool = await dhedge.loadPool(TEST_POOL);
    const assets = [WMATIC, STMATIC];
    const amount = await dhedge.utils.getBalance(
      "0xaF5E0B5425dE1F5a630A8cB5AA9D97B8141C908D",
      pool.address
    );
    try {
      result = await pool.exitBalancerPool(
        "0xaf5e0b5425de1f5a630a8cb5aa9d97b8141c908d000200000000000000000366",
        assets,
        amount,
        1,
        options
      );
      console.log("result", result);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });
});
