import { FeeAmount } from "@uniswap/v3-sdk";
import { Dhedge, ethers } from "..";
import { Network } from "../types";
import { TEST_POOL, WETH, WBTC } from "./constants";

import { wallet } from "./wallet";

let dhedge: Dhedge;

jest.setTimeout(100000);

const options = {
  gasLimit: 2000000,
  gasPrice: ethers.utils.parseUnits("1000", "gwei")
};

describe("pool", () => {
  beforeAll(() => {
    dhedge = new Dhedge(wallet, Network.POLYGON);
  });

  // it("approves unlimited WETH on for UniswapV3 LP", async () => {
  //   let result;
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   try {
  //     result = await pool.approveUniswapV3Liquidity(
  //       WBTC,
  //       ethers.constants.MaxInt256,
  //       options
  //     );
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  it("adds WETH and WBTC to V3 pool", async () => {
    let result;
    const pool = await dhedge.loadPool(TEST_POOL);
    const wethBalance = await dhedge.utils.getBalance(WETH, pool.address);
    const daiBalance = await dhedge.utils.getBalance(WBTC, pool.address);

    try {
      result = await pool.addLiquidityUniswapV3(
        WETH,
        WBTC,
        wethBalance,
        daiBalance,
        0.04,
        0.11,
        FeeAmount.LOW,
        options
      );
      console.log(result);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });

  // it("should get lowe range for WETH/USDC pair ", async () => {
  //   const pool = await dhedge.loadPool(TEST_POOL);
  //   const result = await getUniswapV3MintParams(
  //     pool,
  //     WETH,
  //     WBTC,
  //     "1000000",
  //     "10000000000000000",
  //     0.05,
  //     0.18,
  //     FeeAmount.MEDIUM
  //   );
  //   console.log("result", result);
  //   expect(result).not.toBe(null);
  // });
});
