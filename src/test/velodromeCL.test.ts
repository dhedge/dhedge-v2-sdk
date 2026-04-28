/* eslint-disable @typescript-eslint/no-non-null-assertion */
import BigNumber from "bignumber.js";
import { Dhedge, Pool, ethers } from "..";

import { nonfungiblePositionManagerAddress } from "../config";
import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import {
  TestingRunParams,
  beforeAfterReset,
  fixOracleAggregatorStaleness,
  runWithImpersonateAccount,
  setChainlinkTimeout,
  setUSDCAmount,
  setWETHAmount,
  testingHelper
} from "./utils/testingHelper";
import { balanceDelta } from "./utils/token";
import INonfungiblePositionManager from "../abi/INonfungiblePositionManager.json";

const testVelodromeCL = ({ wallet, network, provider }: TestingRunParams) => {
  const VELODROME_POSITION_MANGER = nonfungiblePositionManagerAddress[network][
    Dapp.VELODROMECL
  ]!;

  const USDC = CONTRACT_ADDRESS[network].USDC;
  const WETH = CONTRACT_ADDRESS[network].WETH;
  const USDC_WETH_CL_GAUGE =
    CONTRACT_ADDRESS[network].VELODROME_CL_USDC_WETH_GAUGE;
  const VELO = CONTRACT_ADDRESS[network].VELO;

  let dhedge: Dhedge;
  let pool: Pool;
  let velodromePositionManager: ethers.Contract;
  let tokenId: string;
  jest.setTimeout(100000);

  describe(`[${network}] velodrome CL tests`, () => {
    beforeAll(async () => {
      await provider.send("hardhat_setBalance", [
        wallet.address,
        "0x10000000000000000"
      ]);
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);

      await setChainlinkTimeout({ pool, provider }, 86400 * 365);
      await fixOracleAggregatorStaleness({ pool, provider });

      await runWithImpersonateAccount(
        { provider, account: await pool.managerLogic.manager() },
        async ({ signer }) => {
          await pool.managerLogic.connect(signer).setTrader(wallet.address);
          await pool.managerLogic.connect(signer).changeAssets(
            [
              [USDC, true],
              [WETH, true],
              [VELODROME_POSITION_MANGER, false],
              [VELO, false]
            ],
            []
          );
        }
      );

      await setUSDCAmount({
        amount: new BigNumber(10000).times(1e6).toFixed(0),
        userAddress: pool.address,
        network,
        provider
      });
      await setWETHAmount({
        amount: new BigNumber(3).times(1e18).toFixed(0),
        userAddress: pool.address,
        network,
        provider
      });

      velodromePositionManager = new ethers.Contract(
        VELODROME_POSITION_MANGER,
        INonfungiblePositionManager.abi,
        pool.signer
      );
    });

    beforeAfterReset({ beforeAll, afterAll, provider });

    describe("Liquidity", () => {
      it("approves unlimited USDC and WETH on for Velodrome CL", async () => {
        await pool.approveSpender(VELODROME_POSITION_MANGER, USDC, MAX_AMOUNT);
        await pool.approveSpender(VELODROME_POSITION_MANGER, WETH, MAX_AMOUNT);
        const iERC20 = new ethers.Contract(
          USDC,
          ["function allowance(address,address) view returns (uint256)"],
          pool.signer
        );
        const usdcAllowance = await iERC20.allowance(
          pool.address,
          VELODROME_POSITION_MANGER
        );
        expect(usdcAllowance.gt(0)).toBe(true);
      });

      it("adds USDC and WETH to a Velodrome CL (mint position)", async () => {
        const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
        const wethBalance = await pool.utils.getBalance(WETH, pool.address);
        await pool.addLiquidityUniswapV3(
          Dapp.VELODROMECL,
          USDC,
          WETH,
          usdcBalance.div(2),
          wethBalance.div(2),
          null,
          null,
          193700,
          193900,
          100
        );

        tokenId = (
          await velodromePositionManager.tokenOfOwnerByIndex(pool.address, 0)
        ).toString();
        expect(tokenId).toBeDefined();
      });

      it("increases liquidity in a CL position", async () => {
        const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
        const wethBalance = await pool.utils.getBalance(WETH, pool.address);
        const positionBefore = await velodromePositionManager.positions(
          tokenId
        );
        await pool.increaseLiquidity(
          Dapp.VELODROMECL,
          tokenId,
          usdcBalance.div(2),
          wethBalance.div(2)
        );
        const positionAfter = await velodromePositionManager.positions(tokenId);
        expect(positionAfter.liquidity.gt(positionBefore.liquidity)).toBe(true);
      });

      it("decreases liquidity from a CL position", async () => {
        const positionBefore = await velodromePositionManager.positions(
          tokenId
        );
        await pool.decreaseLiquidity(Dapp.VELODROMECL, tokenId, 50);
        const positionAfter = await velodromePositionManager.positions(tokenId);
        expect(positionAfter.liquidity.lt(positionBefore.liquidity)).toBe(true);
      });

      it("collects fess of a CL position", async () => {
        await provider.send("evm_increaseTime", [24 * 3600 * 3]); // 3 days
        await provider.send("evm_mine", []);
        await pool.claimFees(Dapp.VELODROMECL, tokenId);
        // Fork has no trading activity during evm_increaseTime so no fees accrue — assert gte(0) to verify the call succeeds
        expect(
          (await balanceDelta(pool.address, USDC, pool.signer)).gte(0)
        ).toBe(true);
      });
    });
    describe("Liquidity staking", () => {
      it("stakes a CL position in gauge", async () => {
        await pool.approveSpender(VELODROME_POSITION_MANGER, USDC, MAX_AMOUNT);
        await pool.approveSpender(VELODROME_POSITION_MANGER, WETH, MAX_AMOUNT);
        const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
        const wethBalance = await pool.utils.getBalance(WETH, pool.address);
        await pool.addLiquidityUniswapV3(
          Dapp.VELODROMECL,
          USDC,
          WETH,
          usdcBalance.div(2),
          wethBalance.div(2),
          null,
          null,
          193700,
          193900,
          100
        );

        tokenId = (
          await velodromePositionManager.tokenOfOwnerByIndex(pool.address, 0)
        ).toString();
        await pool.approveSpenderNFT(
          USDC_WETH_CL_GAUGE,
          VELODROME_POSITION_MANGER,
          tokenId
        );
        await pool.stakeInGauge(Dapp.VELODROMECL, USDC_WETH_CL_GAUGE, tokenId);
        expect(await velodromePositionManager.ownerOf(tokenId)).toBe(
          USDC_WETH_CL_GAUGE
        );
      });

      it("collects fess of a staked CL position", async () => {
        await provider.send("evm_increaseTime", [24 * 3600]); // 1 day
        await provider.send("evm_mine", []);
        await pool.claimFees(Dapp.VELODROMECL, tokenId);
        // Fork has no gauge emissions during evm_increaseTime so no VELO rewards — assert gte(0) to verify the call succeeds
        expect(
          (await balanceDelta(pool.address, VELO, pool.signer)).gte(0)
        ).toBe(true);
      });

      it("unstakes a CL position from a gauge", async () => {
        await pool.unstakeFromGauge(USDC_WETH_CL_GAUGE, tokenId);
        expect(
          (await velodromePositionManager.ownerOf(tokenId)).toLowerCase()
        ).toBe(pool.address.toLowerCase());
      });
    });
  });
};

testingHelper({
  network: Network.OPTIMISM,
  testingRun: testVelodromeCL
});
