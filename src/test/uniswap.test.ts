/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dhedge, ethers, Pool } from "..";
import { nonfungiblePositionManagerAddress } from "../config";
import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, TEST_POOL } from "./constants";
import {
  setUSDCAmount,
  setWETHAmount,
  runWithImpersonateAccount,
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

      // Fund pool with USDC and WETH
      await setUSDCAmount({
        amount: new BigNumber(10000).times(1e6).toFixed(0),
        userAddress: pool.address,
        network,
        provider
      });
      await setWETHAmount({
        amount: new BigNumber(5).times(1e18).toFixed(0),
        userAddress: pool.address,
        network,
        provider
      });

      // Impersonate the pool manager to set trader and configure assets
      await runWithImpersonateAccount(
        { provider, account: await pool.managerLogic.manager() },
        async ({ signer }) => {
          await pool.managerLogic.connect(signer).setTrader(wallet.address);
          const newAssets = [
            [CONTRACT_ADDRESS[network].USDC, true],
            [CONTRACT_ADDRESS[network].WETH, true],
            [
              CONTRACT_ADDRESS[network].uniswapV3.nonfungiblePositionManager,
              false
            ]
          ];
          await pool.managerLogic.connect(signer).changeAssets(newAssets, []);
        }
      );

      nonfungiblePositionManager = new ethers.Contract(
        CONTRACT_ADDRESS[network].uniswapV3.nonfungiblePositionManager,
        INonfungiblePositionManager.abi,
        pool.signer
      );
    });

    // Note: tradeUniswapV3 (UniswapV3RouterGuard) is deprecated on all chains.
    // Swap tests removed. Use Dapp.ONEINCH or Dapp.KYBERSWAP for trading instead.

    it("approves unlimited USDC and WETH for UniswapV3 LP", async () => {
      const usdcTx = await pool.approveUniswapV3Liquidity(
        CONTRACT_ADDRESS[network].USDC,
        ethers.constants.MaxInt256
      );
      await usdcTx.wait(1);
      const wethTx = await pool.approveUniswapV3Liquidity(
        CONTRACT_ADDRESS[network].WETH,
        ethers.constants.MaxInt256
      );
      await wethTx.wait(1);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const positionManager = nonfungiblePositionManagerAddress[network][
        Dapp.UNISWAPV3
      ]!;
      const allowanceAbi = [
        "function allowance(address,address) view returns (uint256)"
      ];
      const usdcAllowance = await new ethers.Contract(
        CONTRACT_ADDRESS[network].USDC,
        allowanceAbi,
        pool.signer
      ).allowance(pool.address, positionManager);
      const wethAllowance = await new ethers.Contract(
        CONTRACT_ADDRESS[network].WETH,
        allowanceAbi,
        pool.signer
      ).allowance(pool.address, positionManager);
      expect(usdcAllowance.gt(0)).toBe(true);
      expect(wethAllowance.gt(0)).toBe(true);
    });

    it("adds WETH and USDC to a new V3 pool", async () => {
      const pool = await dhedge.loadPool(TEST_POOL[network]);
      const usdcBalance = await dhedge.utils.getBalance(
        CONTRACT_ADDRESS[network].USDC,
        pool.address
      );
      const wethBalance = await dhedge.utils.getBalance(
        CONTRACT_ADDRESS[network].WETH,
        pool.address
      );

      const result = await pool.addLiquidityUniswapV3(
        Dapp.UNISWAPV3,
        CONTRACT_ADDRESS[network].WETH,
        CONTRACT_ADDRESS[network].USDC,
        wethBalance,
        usdcBalance,
        3500,
        4000,
        null,
        null,
        500
      );
      await result.wait(1);

      tokenId = await nonfungiblePositionManager.tokenOfOwnerByIndex(
        pool.address,
        0
      );
      expect(result).not.toBe(null);
    });

    it("should remove 50% liquidity from an existing pool", async () => {
      const result = await pool.decreaseLiquidity(
        Dapp.UNISWAPV3,
        tokenId.toString(),
        50 // percent
      );
      expect(result).not.toBe(null);
    });

    it("should increase liquidity in the existing WETH/USDC pool", async () => {
      const usdcBalance = await dhedge.utils.getBalance(
        CONTRACT_ADDRESS[network].USDC,
        pool.address
      );
      const wethBalance = await dhedge.utils.getBalance(
        CONTRACT_ADDRESS[network].WETH,
        pool.address
      );

      const result = await pool.increaseLiquidity(
        Dapp.UNISWAPV3,
        tokenId.toString(),
        wethBalance,
        usdcBalance
      );
      expect(result).not.toBe(null);
    });

    it("should claim fees from an existing pool", async () => {
      const result = await pool.claimFees(Dapp.UNISWAPV3, tokenId.toString());
      expect(result).not.toBe(null);
    });
  });
};

testingHelper({
  network: Network.ARBITRUM,
  testingRun: testUniswapV3,
  onFork: true
});
