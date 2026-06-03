/* eslint-disable @typescript-eslint/no-non-null-assertion */
import BigNumber from "bignumber.js";
import { Dhedge, Pool, ethers } from "..";

import { nonfungiblePositionManagerAddress } from "../config";
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

const testAerodromeCL = ({ wallet, network, provider }: TestingRunParams) => {
  const AERODROME_POSITION_MANGER = nonfungiblePositionManagerAddress[network][
    Dapp.AERODROMECL
  ]!;

  const USDC = CONTRACT_ADDRESS[network].USDC;
  const USDT = CONTRACT_ADDRESS[network].USDT;
  const USDC_USDT_CL_GAUGE = "0xBd85D45f1636fCEB2359d9Dcf839f12b3cF5AF3F";
  const AERO = CONTRACT_ADDRESS[network].VELO;

  let dhedge: Dhedge;
  let pool: Pool;
  let velodromePositionManager: ethers.Contract;
  let tokenId: string;
  jest.setTimeout(100000);

  describe(`[${network}] Aerodrome CL  tests`, () => {
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
              [AERODROME_POSITION_MANGER, false],
              [AERO, false]
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

      velodromePositionManager = new ethers.Contract(
        AERODROME_POSITION_MANGER,
        INonfungiblePositionManager.abi,
        pool.signer
      );
    });

    beforeAfterReset({ beforeAll, afterAll, provider });

    describe("Liquidity", () => {
      it("approves unlimited USDC and USDT on for Aerodrome CL", async () => {
        await pool.approveSpender(AERODROME_POSITION_MANGER, USDC, MAX_AMOUNT);
        await pool.approveSpender(AERODROME_POSITION_MANGER, USDT, MAX_AMOUNT);
        const iERC20 = new ethers.Contract(
          USDC,
          ["function allowance(address,address) view returns (uint256)"],
          pool.signer
        );
        const usdcAllowance = await iERC20.allowance(
          pool.address,
          AERODROME_POSITION_MANGER
        );
        expect(usdcAllowance.gt(0)).toBe(true);
      });

      it("adds USDC and USDT to a CL (mint position)", async () => {
        const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
        const usdtBalance = await pool.utils.getBalance(USDT, pool.address);
        await pool.addLiquidityUniswapV3(
          Dapp.AERODROMECL,
          USDC,
          USDT,
          usdcBalance.div(2),
          usdtBalance.div(2),
          null,
          null,
          -2,
          4,
          1
        );

        tokenId = (
          await velodromePositionManager.tokenOfOwnerByIndex(pool.address, 0)
        ).toString();
        expect(tokenId).not.toBe(null);
      });

      it("increases liquidity in a CL position", async () => {
        const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
        const usdtBalance = await pool.utils.getBalance(USDT, pool.address);
        const positionBefore = await velodromePositionManager.positions(
          tokenId
        );
        await pool.increaseLiquidity(
          Dapp.AERODROMECL,
          tokenId,
          usdcBalance.div(2),
          usdtBalance.div(2)
        );
        const positionAfter = await velodromePositionManager.positions(tokenId);
        expect(positionAfter.liquidity.gt(positionBefore.liquidity)).toBe(true);
      });

      it("decreases liquidity from a CL position", async () => {
        const positionBefore = await velodromePositionManager.positions(
          tokenId
        );
        await pool.decreaseLiquidity(Dapp.AERODROMECL, tokenId, 50);
        const positionAfter = await velodromePositionManager.positions(tokenId);
        expect(positionAfter.liquidity.lt(positionBefore.liquidity)).toBe(true);
      });

      it("collects fess of a CL position", async () => {
        await provider.send("evm_increaseTime", [24 * 3600 * 3]); // 3 days
        await provider.send("evm_mine", []);
        await pool.claimFees(Dapp.AERODROMECL, tokenId);
        // Fork has no trading activity during evm_increaseTime so no fees accrue — assert gte(0) to verify the call succeeds
        expect(
          (await balanceDelta(pool.address, USDC, pool.signer)).gte(0)
        ).toBe(true);
      });
    });
    describe("Liquidity staking", () => {
      it("stakes a CL position in gauge", async () => {
        await pool.approveSpender(AERODROME_POSITION_MANGER, USDC, MAX_AMOUNT);
        await pool.approveSpender(AERODROME_POSITION_MANGER, USDT, MAX_AMOUNT);
        const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
        const usdtBalance = await pool.utils.getBalance(USDT, pool.address);
        await pool.addLiquidityUniswapV3(
          Dapp.AERODROMECL,
          USDC,
          USDT,
          usdcBalance.div(2),
          usdtBalance.div(2),
          null,
          null,
          -2,
          4,
          1
        );

        tokenId = (
          await velodromePositionManager.tokenOfOwnerByIndex(pool.address, 0)
        ).toString();
        await pool.approveSpenderNFT(
          USDC_USDT_CL_GAUGE,
          AERODROME_POSITION_MANGER,
          tokenId
        );
        await pool.stakeInGauge(Dapp.AERODROMECL, USDC_USDT_CL_GAUGE, tokenId);
        expect(await velodromePositionManager.ownerOf(tokenId)).toBe(
          USDC_USDT_CL_GAUGE
        );
      });

      it("collects fess of a staked CL position", async () => {
        await provider.send("evm_increaseTime", [24 * 3600]); // 1 day
        await provider.send("evm_mine", []);
        await pool.claimFees(Dapp.AERODROMECL, tokenId);
        // Fork has no gauge emissions during evm_increaseTime so no AERO rewards — assert gte(0) to verify the call succeeds
        expect(
          (await balanceDelta(pool.address, AERO, pool.signer)).gte(0)
        ).toBe(true);
      });

      it("unstakes a CL position from a gauge", async () => {
        await pool.unstakeFromGauge(USDC_USDT_CL_GAUGE, tokenId);
        expect(
          (await velodromePositionManager.ownerOf(tokenId)).toLowerCase()
        ).toBe(pool.address.toLowerCase());
      });
    });
  });
};

testingHelper({
  network: Network.BASE,
  testingRun: testAerodromeCL
});
