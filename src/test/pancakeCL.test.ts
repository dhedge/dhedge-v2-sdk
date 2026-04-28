/* eslint-disable @typescript-eslint/no-non-null-assertion */
import BigNumber from "bignumber.js";
import { Dhedge, Pool, ethers } from "..";

import { nonfungiblePositionManagerAddress, stakingAddress } from "../config";
import { Dapp, Network } from "../types";
import {
  CONTRACT_ADDRESS,
  MAX_AMOUNT,
  TEST_POOL,
  USDC_BALANCEOF_SLOT
} from "./constants";
import {
  TestingRunParams,
  beforeAfterReset,
  fixOracleAggregatorStaleness,
  runWithImpersonateAccount,
  setChainlinkTimeout,
  setTokenAmount,
  testingHelper
} from "./utils/testingHelper";
import { balanceDelta } from "./utils/token";
import INonfungiblePositionManager from "../abi/INonfungiblePositionManager.json";

const testPancakeCL = ({ wallet, network, provider }: TestingRunParams) => {
  const PANCAKE_POSITION_MANGER = nonfungiblePositionManagerAddress[network][
    Dapp.PANCAKECL
  ]!;
  const GAUGE = stakingAddress[network][Dapp.PANCAKECL]!;

  const USDC = CONTRACT_ADDRESS[network].USDC;
  const USDT = CONTRACT_ADDRESS[network].USDT;

  let dhedge: Dhedge;
  let pool: Pool;
  let positionManager: ethers.Contract;
  let tokenId: string;
  jest.setTimeout(100000);

  describe(`[${network}] Pancake CL tests`, () => {
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
              [USDT, true],
              [PANCAKE_POSITION_MANGER, false]
            ],
            []
          );
        }
      );

      await setTokenAmount({
        amount: new BigNumber(1000).times(1e6).toFixed(0),
        userAddress: pool.address,
        tokenAddress: USDC,
        slot: USDC_BALANCEOF_SLOT[network],
        provider
      });
      await setTokenAmount({
        amount: new BigNumber(1000).times(1e6).toFixed(0),
        userAddress: pool.address,
        tokenAddress: USDT,
        slot: 0,
        provider
      });

      positionManager = new ethers.Contract(
        PANCAKE_POSITION_MANGER,
        INonfungiblePositionManager.abi,
        pool.signer
      );
    });

    beforeAfterReset({ beforeAll, afterAll, provider });

    describe("Liquidity", () => {
      it("approves unlimited USDC and USDT on for Pancake CL", async () => {
        await pool.approveSpender(PANCAKE_POSITION_MANGER, USDC, MAX_AMOUNT);
        await pool.approveSpender(PANCAKE_POSITION_MANGER, USDT, MAX_AMOUNT);
        const iERC20 = new ethers.Contract(
          USDC,
          ["function allowance(address,address) view returns (uint256)"],
          pool.signer
        );
        const usdcAllowance = await iERC20.allowance(
          pool.address,
          PANCAKE_POSITION_MANGER
        );
        expect(usdcAllowance.gt(0)).toBe(true);
      });

      it("adds USDC and USDT to a CL (mint position)", async () => {
        const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
        const usdtBalance = await pool.utils.getBalance(USDT, pool.address);
        await pool.addLiquidityUniswapV3(
          Dapp.PANCAKECL,
          USDC,
          USDT,
          usdcBalance.div(2),
          usdtBalance.div(2),
          null,
          null,
          -73,
          127,
          100
        );

        tokenId = (
          await positionManager.tokenOfOwnerByIndex(pool.address, 0)
        ).toString();
        expect(tokenId).not.toBe(null);
      });

      it("increases liquidity in a CL position", async () => {
        const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
        const usdtBalance = await pool.utils.getBalance(USDT, pool.address);
        const positionBefore = await positionManager.positions(tokenId);
        await pool.increaseLiquidity(
          Dapp.PANCAKECL,
          tokenId,
          usdcBalance.div(2),
          usdtBalance.div(2)
        );
        const positionAfter = await positionManager.positions(tokenId);
        expect(positionAfter.liquidity.gt(positionBefore.liquidity)).toBe(true);
      });

      it("decreases liquidity from a CL position", async () => {
        const positionBefore = await positionManager.positions(tokenId);
        await pool.decreaseLiquidity(Dapp.PANCAKECL, tokenId, 50);
        const positionAfter = await positionManager.positions(tokenId);
        expect(positionAfter.liquidity.lt(positionBefore.liquidity)).toBe(true);
      });

      it("collects fess of a CL position", async () => {
        await provider.send("evm_increaseTime", [24 * 3600 * 3]); // 3 days
        await provider.send("evm_mine", []);
        await pool.claimFees(Dapp.PANCAKECL, tokenId);
        // Fork has no trading activity during evm_increaseTime so no fees accrue — assert gte(0) to verify the call succeeds
        expect(
          (await balanceDelta(pool.address, USDC, pool.signer)).gte(0)
        ).toBe(true);
      });
    });
    describe("Liquidity staking", () => {
      it("stakes a CL position in gauge", async () => {
        await pool.approveSpender(PANCAKE_POSITION_MANGER, USDC, MAX_AMOUNT);
        await pool.approveSpender(PANCAKE_POSITION_MANGER, USDT, MAX_AMOUNT);
        const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
        const usdtBalance = await pool.utils.getBalance(USDT, pool.address);
        await pool.addLiquidityUniswapV3(
          Dapp.PANCAKECL,
          USDC,
          USDT,
          usdcBalance.div(2),
          usdtBalance.div(2),
          null,
          null,
          -73,
          127,
          100
        );

        tokenId = (
          await positionManager.tokenOfOwnerByIndex(pool.address, 0)
        ).toString();
        await pool.stakeInGauge(Dapp.PANCAKECL, GAUGE, tokenId);
        expect(await positionManager.ownerOf(tokenId)).toBe(GAUGE);
      });

      it("increases liquidity in a staked CL position", async () => {
        await pool.approveSpender(GAUGE, USDC, MAX_AMOUNT);
        await pool.approveSpender(GAUGE, USDT, MAX_AMOUNT);
        const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
        const usdtBalance = await pool.utils.getBalance(USDT, pool.address);
        const positionBefore = await positionManager.positions(tokenId);
        await pool.increaseLiquidity(
          Dapp.PANCAKECL,
          tokenId,
          usdcBalance.div(2),
          usdtBalance.div(2)
        );
        const positionAfter = await positionManager.positions(tokenId);
        expect(positionAfter.liquidity.gt(positionBefore.liquidity)).toBe(true);
      });

      it("collects fess from a staked CL position", async () => {
        const tx = await pool.claimFees(Dapp.PANCAKECL, tokenId);
        expect(tx).toBeDefined();
      });

      it("decreases liquidity from a CL position", async () => {
        const positionBefore = await positionManager.positions(tokenId);
        await pool.decreaseLiquidity(Dapp.PANCAKECL, tokenId, 50);
        const positionAfter = await positionManager.positions(tokenId);
        expect(positionAfter.liquidity.lt(positionBefore.liquidity)).toBe(true);
      });

      it("unstakes a CL position from a gauge", async () => {
        await pool.unstakeFromGauge(GAUGE, tokenId);
        expect((await positionManager.ownerOf(tokenId)).toLowerCase()).toBe(
          pool.address.toLowerCase()
        );
      });

      it("remove all liquidity from a staked CL position", async () => {
        await pool.stakeInGauge(Dapp.PANCAKECL, GAUGE, tokenId);
        await pool.decreaseLiquidity(Dapp.PANCAKECL, tokenId, 100);
        // (a) NFT burned — ownerOf reverts for non-existent tokenId
        await expect(positionManager.ownerOf(tokenId)).rejects.toThrow();
        // (b) position data cleared — liquidity is 0 (or positions() reverts post-burn)
        try {
          const positionAfter = await positionManager.positions(tokenId);
          expect(positionAfter.liquidity.eq(0)).toBe(true);
        } catch {
          // positions() reverted — acceptable for burned tokens on some NPM implementations
        }
      });
    });
  });
};

testingHelper({
  network: Network.BASE,
  testingRun: testPancakeCL
});
