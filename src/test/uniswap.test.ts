/* eslint-disable @typescript-eslint/no-explicit-any */
import { FeeAmount } from "@uniswap/v3-sdk";
import { Dhedge, ethers, Pool } from "..";
import { routerAddress } from "../config";
import { AssetEnabled, Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, TEST_POOL } from "./constants";
import { allowanceDelta, balanceDelta } from "./utils/token";
import {
  setUSDCAmount,
  testingHelper,
  TestingRunParams
} from "./utils/testingHelper";
import BigNumber from "bignumber.js";
import INonfungiblePositionManager from "../abi/INonfungiblePositionManager.json";

const testUniswapV3 = ({ wallet, network, provider }: TestingRunParams) => {
  let dhedge: Dhedge;
  let pool: Pool;
  let nonfungiblePositionManager: ethers.Contract;
  let tokenId: ethers.BigNumber;

  jest.setTimeout(600000);
  describe(`testUniswapV3 on ${network}`, () => {
    beforeAll(async () => {
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);

      // top up gas
      await provider.send("hardhat_setBalance", [
        wallet.address,
        "0x10000000000000000"
      ]);
      await provider.send("evm_mine", []);
      await setUSDCAmount({
        amount: new BigNumber(1000000).times(1e6).toFixed(0),
        userAddress: pool.address,
        network,
        provider
      });
      try {
        const newAssets: AssetEnabled[] = [
          { asset: CONTRACT_ADDRESS[network].USDC, isDeposit: true },
          { asset: CONTRACT_ADDRESS[network].WETH, isDeposit: true },
          {
            asset:
              CONTRACT_ADDRESS[network].uniswapV3.nonfungiblePositionManager,
            isDeposit: false
          }
        ];
        await pool.changeAssets(newAssets);

        nonfungiblePositionManager = new ethers.Contract(
          CONTRACT_ADDRESS[network].uniswapV3.nonfungiblePositionManager,
          INonfungiblePositionManager.abi,
          pool.signer
        );
      } catch (e) {
        console.log("e", e);
      }
    });

    it("approves unlimited USDC on for trading on UniswapV3", async () => {
      await pool.approve(
        Dapp.UNISWAPV3,
        CONTRACT_ADDRESS[network].USDC,
        ethers.constants.MaxUint256
      );
      const UsdcAllowanceDelta = await allowanceDelta(
        pool.address,
        CONTRACT_ADDRESS[network].USDC,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        routerAddress[network].uniswapV3!,
        pool.signer
      );
      expect(UsdcAllowanceDelta.gte(0));
    });

    it("should swap 5000 USDC into WETH on UniswapV3", async () => {
      await pool.tradeUniswapV3(
        CONTRACT_ADDRESS[network].USDC,
        CONTRACT_ADDRESS[network].WETH,
        new BigNumber(5000).times(1e6).toFixed(0),
        FeeAmount.LOW,
        0.5
      );

      const wethAllowanceDelta = await balanceDelta(
        pool.address,
        CONTRACT_ADDRESS[network].WETH,
        pool.signer
      );
      expect(wethAllowanceDelta.gt(0));
    });

    it("approves unlimited WETH on for UniswapV3 LP", async () => {
      await pool.approveUniswapV3Liquidity(
        CONTRACT_ADDRESS[network].USDC,
        ethers.constants.MaxInt256
      );
      await pool.approveUniswapV3Liquidity(
        CONTRACT_ADDRESS[network].WETH,
        ethers.constants.MaxInt256
      );
      const UsdcAllowanceDelta = await allowanceDelta(
        pool.address,
        CONTRACT_ADDRESS[network].USDC,
        pool.address,
        pool.signer
      );

      expect(UsdcAllowanceDelta).not.toBe(null);
    });

    it("adds WETH and USDC to a new V3 pool", async () => {
      let result = null;
      const pool = await dhedge.loadPool(TEST_POOL[network]);
      const usdcBalance = await dhedge.utils.getBalance(
        CONTRACT_ADDRESS[network].USDC,
        pool.address
      );
      const wethBalance = await dhedge.utils.getBalance(
        CONTRACT_ADDRESS[network].WETH,
        pool.address
      );

      try {
        result = await pool.addLiquidityUniswapV3(
          CONTRACT_ADDRESS[network].WETH,
          CONTRACT_ADDRESS[network].USDC,
          wethBalance,
          usdcBalance,
          2000,
          3000,
          null,
          null,
          FeeAmount.LOW
          // options
        );
        await result.wait(1);

        tokenId = await nonfungiblePositionManager.tokenOfOwnerByIndex(
          pool.address,
          0
        );
      } catch (e) {
        console.log("e", e);
      }
      expect(result).not.toBe(null);
    });

    it("should remove liquidity from an existing pool ", async () => {
      const result = await pool.decreaseLiquidity(
        Dapp.UNISWAPV3,
        tokenId.toString(),
        50 // precent
      );
      // console.log("result", result);
      expect(result).not.toBe(null);
    });

    it("should increase liquidity in the existing WETH/USDC pool", async () => {
      const result = await pool.increaseLiquidity(
        Dapp.UNISWAPV3,
        tokenId.toString(),
        new BigNumber(3000).times(1e6).toFixed(0), // usdc
        new BigNumber(1).times(1e18).toFixed(0) // eth
      );
      // console.log("result", result);
      expect(result).not.toBe(null);
    });

    it("should claim fees an existing pool", async () => {
      const result = await pool.claimFees(Dapp.UNISWAPV3, tokenId.toString());
      // console.log("result", result);
      expect(result).not.toBe(null);
    });

    // it("approves unlimited USDC to swap on UniswapV3", async () => {
    //   let result;
    //   const pool = await dhedge.loadPool(TEST_POOL);
    //   try {
    //     result = await pool.approve(
    //       Dapp.UNISWAPV3,
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

    // it("should swap USDC into WETH on UniswapV3 pool", async () => {
    //   const pool = await dhedge.loadPool(TEST_POOL);
    //   const result = await pool.tradeUniswapV3(
    //     USDC,
    //     WETH,
    //     "1000000",
    //     FeeAmount.LOW,
    //     1,
    //     options
    //   );

    //   console.log(result);
    //   expect(result).not.toBe(null);
    // });
  });
};

testingHelper({
  network: Network.OPTIMISM,
  testingRun: testUniswapV3
});

testingHelper({
  network: Network.POLYGON,
  testingRun: testUniswapV3
});

testingHelper({
  network: Network.ARBITRUM,
  testingRun: testUniswapV3
});
