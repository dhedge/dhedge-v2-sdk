import { Dhedge, Pool, ethers } from "..";

import { nonfungiblePositionManagerAddress, stakingAddress } from "../config";
import { AssetEnabled, Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import {
  TestingRunParams,
  beforeAfterReset,
  setChainlinkTimeout,
  testingHelper
} from "./utils/testingHelper";
import { allowanceDelta, balanceDelta } from "./utils/token";
import INonfungiblePositionManager from "../abi/INonfungiblePositionManager.json";

const testPancakeCL = ({ wallet, network, provider }: TestingRunParams) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const PANCAKE_POSITION_MANGER = nonfungiblePositionManagerAddress[network][
    Dapp.PANCAKECL
  ]!;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
      await provider.send("evm_mine", []);
      // top up ETH (gas)
      await provider.send("hardhat_setBalance", [
        wallet.address,
        "0x100000000000000"
      ]);
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);

      // setChainlinkTimeout
      await setChainlinkTimeout({ pool, provider }, 86400 * 365);

      const newAssets: AssetEnabled[] = [
        { asset: USDC, isDeposit: true },
        { asset: USDT, isDeposit: true },
        {
          asset: PANCAKE_POSITION_MANGER,
          isDeposit: false
        }
      ];
      await pool.managerLogic.changeAssets(newAssets, []);

      positionManager = new ethers.Contract(
        PANCAKE_POSITION_MANGER,
        INonfungiblePositionManager.abi,
        pool.signer
      );
    });

    beforeAfterReset({ beforeAll, afterAll, provider });

    describe("Liquidity", () => {
      it("approves unlimited USDC and USDT on for Aerodrome CL", async () => {
        await pool.approveSpender(PANCAKE_POSITION_MANGER, USDC, MAX_AMOUNT);
        await pool.approveSpender(PANCAKE_POSITION_MANGER, USDT, MAX_AMOUNT);
        const UsdcAllowanceDelta = await allowanceDelta(
          pool.address,
          USDC,
          PANCAKE_POSITION_MANGER,
          pool.signer
        );
        await expect(UsdcAllowanceDelta.gt(0));
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
        expect(positionAfter.liquidity.gt(positionBefore.liquidity));
      });

      it("decreases liquidity from a CL position", async () => {
        const positionBefore = await positionManager.positions(tokenId);
        await pool.decreaseLiquidity(Dapp.PANCAKECL, tokenId, 50);
        const positionAfter = await positionManager.positions(tokenId);
        expect(positionAfter.liquidity.lt(positionBefore.liquidity));
      });

      it("collects fess of a CL position", async () => {
        await provider.send("evm_increaseTime", [24 * 3600 * 3]); // 1 day
        await provider.send("evm_mine", []);
        await pool.claimFees(Dapp.PANCAKECL, tokenId);
        expect((await balanceDelta(pool.address, USDC, pool.signer)).gt(0));
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
        expect(positionAfter.liquidity.gt(positionBefore.liquidity));
      });

      it("decreases liquidity from a CL position", async () => {
        const positionBefore = await positionManager.positions(tokenId);
        await pool.decreaseLiquidity(Dapp.PANCAKECL, tokenId, 50);
        const positionAfter = await positionManager.positions(tokenId);
        expect(positionAfter.liquidity.lt(positionBefore.liquidity));
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
        expect((await positionManager.balanceOf(pool.address)).eq(0));
      });
    });
  });
};

testingHelper({
  network: Network.BASE,
  testingRun: testPancakeCL
});
