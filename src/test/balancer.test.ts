import { Dhedge } from "..";
import { Network } from "../types";
import { TEST_POOL } from "./constants";

import { wallet } from "./wallet";

let dhedge: Dhedge;

jest.setTimeout(100000);

// const options = {
//   gasLimit: 2000000,
//   gasPrice: ethers.utils.parseUnits("700", "gwei")
// };

describe("pool", () => {
  beforeAll(() => {
    dhedge = new Dhedge(wallet, Network.POLYGON);
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

  it("claims balancer rewards", async () => {
    let result;
    const pool = await dhedge.loadPool(TEST_POOL);
    try {
      result = await pool.harvestBalancerRewards();
      console.log("result", result);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });
});
