import { Dhedge, Pool, ethers } from "..";

import { nonfungiblePositionManagerAddress } from "../config";
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

const testRamsesCL = ({ wallet, network, provider }: TestingRunParams) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const RAMSES_POSITION_MANGER = nonfungiblePositionManagerAddress[network][
    Dapp.RAMSESCL
  ]!;

  const USDC = CONTRACT_ADDRESS[network].USDC;
  const WETH = CONTRACT_ADDRESS[network].WETH;
  //if other chains then define per network
  const RAM = "0xaaa6c1e32c55a7bfa8066a6fae9b42650f262418";
  const ARB = "0x912ce59144191c1204e64559fe8253a0e49e6548";

  let dhedge: Dhedge;
  let pool: Pool;
  let ramsesPositionManager: ethers.Contract;
  let tokenId: string;
  jest.setTimeout(100000);

  describe(`[${network}] Ramses CL  tests`, () => {
    beforeAll(async () => {
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
        { asset: WETH, isDeposit: true },
        {
          asset: RAMSES_POSITION_MANGER,
          isDeposit: false
        },
        {
          asset: ARB,
          isDeposit: false
        }
      ];
      await pool.changeAssets(newAssets);
      await pool.approve(Dapp.ONEINCH, USDC, MAX_AMOUNT);
      await pool.trade(Dapp.ONEINCH, USDC, WETH, (2.5 * 1e6).toString());

      ramsesPositionManager = new ethers.Contract(
        RAMSES_POSITION_MANGER,
        INonfungiblePositionManager.abi,
        pool.signer
      );
    });

    beforeAfterReset({ beforeAll, afterAll, provider });

    describe("Liquidity", () => {
      it("approves unlimited USDC and WETH on for Velodrome CL", async () => {
        await pool.approveSpender(RAMSES_POSITION_MANGER, USDC, MAX_AMOUNT);
        await pool.approveSpender(RAMSES_POSITION_MANGER, WETH, MAX_AMOUNT);
        const UsdcAllowanceDelta = await allowanceDelta(
          pool.address,
          USDC,
          RAMSES_POSITION_MANGER,
          pool.signer
        );
        await expect(UsdcAllowanceDelta.gt(0));
      });

      it("adds USDC and WETH to a Velodrome CL (mint position)", async () => {
        const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
        const wethBalance = await pool.utils.getBalance(WETH, pool.address);
        await pool.addLiquidityUniswapV3(
          Dapp.RAMSESCL,
          WETH,
          USDC,
          usdcBalance.div(2),
          wethBalance.div(2),
          null,
          null,
          -204460,
          -193470,
          500
        );

        tokenId = (
          await ramsesPositionManager.tokenOfOwnerByIndex(pool.address, 0)
        ).toString();
        expect(tokenId).not.toBe(null);
      });

      it("increases liquidity in a CL position", async () => {
        const usdcBalance = await pool.utils.getBalance(USDC, pool.address);
        const wethBalance = await pool.utils.getBalance(WETH, pool.address);
        const positionBefore = await ramsesPositionManager.positions(tokenId);
        await pool.increaseLiquidity(
          Dapp.RAMSESCL,
          tokenId,
          usdcBalance.div(2),
          wethBalance.div(2)
        );
        const positionAfter = await ramsesPositionManager.positions(tokenId);
        expect(positionAfter.liquidity.gt(positionBefore.liquidity));
      });

      it("decreases liquidity from a CL position", async () => {
        const positionBefore = await ramsesPositionManager.positions(tokenId);
        await pool.decreaseLiquidity(Dapp.RAMSESCL, tokenId, 50);
        const positionAfter = await ramsesPositionManager.positions(tokenId);
        expect(positionAfter.liquidity.lt(positionBefore.liquidity));
      });

      it("collects fess of a CL position", async () => {
        await provider.send("evm_increaseTime", [24 * 3600 * 3]); // 1 day
        await provider.send("evm_mine", []);
        await pool.claimFees(Dapp.RAMSESCL, tokenId);
        expect((await balanceDelta(pool.address, USDC, pool.signer)).gt(0));
      });

      it("get rewards of a CL position", async () => {
        await provider.send("evm_increaseTime", [24 * 3600 * 3]); // 1 day
        await provider.send("evm_mine", []);
        await pool.getRewards(Dapp.RAMSESCL, tokenId, [RAM]);
        expect((await balanceDelta(pool.address, RAM, pool.signer)).gt(0));
      });

      it("decreases 100% liquidity and burns a CL position", async () => {
        await pool.decreaseLiquidity(Dapp.RAMSESCL, tokenId, 100);
        const positionAfter = await ramsesPositionManager.balanceOf(
          pool.address
        );
        expect(positionAfter.eq(0));
      });
    });
  });
};

testingHelper({
  network: Network.ARBITRUM,
  testingRun: testRamsesCL
});
