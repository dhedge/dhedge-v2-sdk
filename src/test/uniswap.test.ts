import { Dhedge, ethers } from "..";
import { Network } from "../types";
import { DAI, TEST_POOL, WETH } from "./constants";

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
  //       DAI,
  //       ethers.constants.MaxInt256,
  //       options
  //     );
  //     console.log(result);
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   expect(result).not.toBe(null);
  // });

  it("adds WETH and DAI to V3 pool", async () => {
    let result;
    const pool = await dhedge.loadPool(TEST_POOL);
    const wethBalance = await dhedge.utils.getBalance(WETH, pool.address);
    const daiBalance = await dhedge.utils.getBalance(DAI, pool.address);

    try {
      result = await pool.addLiquidityUniswapV3(
        WETH,
        DAI,
        wethBalance,
        daiBalance,
        76020,
        82920,
        3000,
        options
      );
      console.log(result);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });
});
