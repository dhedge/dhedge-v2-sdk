import { Dhedge, Network, Pool } from "..";
import { CONTRACT_ADDRESS, TEST_POOL } from "./constants";

import { testingHelper, TestingRunParams } from "./utils/testingHelper";
import { balanceDelta } from "./utils/token";
// import { allowanceDelta } from "./utils/token";
// import { balanceDelta } from "./utils/token";

const testPool = ({ wallet, network }: TestingRunParams) => {
  let dhedge: Dhedge;
  let pool: Pool;

  jest.setTimeout(200000);

  describe(`pool on ${network}`, () => {
    beforeAll(async () => {
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(TEST_POOL[network]);
    });

    // it("checks fund composition", async () => {
    //   const result = await pool.getComposition();
    //   console.log(result);
    //   expect(result.length).toBeGreaterThan(0);
    // });

    // it("sets max supply cap", async () => {
    //   const totalSupply: BigNumber = await pool.poolLogic.totalSupply();
    //   let initCap = totalSupply;
    //   if (totalSupply.eq(0)) {
    //     initCap = BigNumber.from(1000).mul(BigNumber.from(10).pow(18));
    //   }
    //   await pool.setMaxCap(initCap.mul(2), null, true);
    //   const tx = await pool.setMaxCap(initCap.mul(2));
    //   await tx.wait(1);
    //   const maxCapAfter: BigNumber = await pool.managerLogic.maxSupplyCap();
    //   expect(maxCapAfter).toEqual(initCap.mul(2));
    // });

    // it("sets pool private", async () => {
    //   const result = await pool.setPrivate(true);
    //   expect(result).not.toBeNull();
    // });

    // it("adds WBTC to enabled assets", async () => {
    //   const assetsBefore = await pool.getComposition();

    //   const newAssets: AssetEnabled[] = [
    //     { asset: CONTRACT_ADDRESS[network].USDC, isDeposit: true },
    //     {
    //       asset: "0x3333333333333333333333333333333333333333",
    //       isDeposit: false
    //     }
    //   ];
    //   await pool.changeAssets(newAssets);
    //   const assetsAfter = await pool.getComposition();
    //   expect(assetsAfter.length).toBeLessThanOrEqual(assetsBefore.length);
    // });

    // it("approves USDT balance of User for Deposit", async () => {
    //   await pool.approveDeposit(
    //     CONTRACT_ADDRESS[network].USDC,
    //     ethers.constants.MaxUint256
    //   );
    //   const usdtAllowanceDelta = await allowanceDelta(
    //     pool.signer.address,
    //     CONTRACT_ADDRESS[network].USDC,
    //     pool.address,
    //     pool.signer
    //   );
    //   expect(usdtAllowanceDelta.gt(0));
    // });

    it("deposits 200 USDT into Pool", async () => {
      await pool.deposit(CONTRACT_ADDRESS[network].USDC, (30000000).toString());
      const poolTokenDelta = await balanceDelta(
        pool.address,
        CONTRACT_ADDRESS[network].USDC,
        pool.signer
      );
      expect(poolTokenDelta.gt(0));
    });

    //   it("get available Manager Fee", async () => {
    //     const result = await pool.getAvailableManagerFee();
    //     expect(result).toBeInstanceOf(BigNumber);
    //   });

    //   it("mintManagerFee; should not revert", async () => {
    //     const tx = await pool.mintManagerFee();
    //     expect(tx).toHaveProperty("wait");
    //   });

    //   it("withdraw 0.1 pool token into Pool", async () => {
    //     await provider.send("evm_increaseTime", [24 * 60 * 60]);
    //     await provider.send("evm_mine", []);
    //     await pool.withdraw((0.1 * 1e18).toString());
    //     const poolTokenDelta = await balanceDelta(
    //       pool.signer.address,
    //       pool.address,
    //       pool.signer
    //     );
    //     expect(poolTokenDelta.lt(0));
    //   });
  });
};

// testingHelper({
//   network: Network.POLYGON,
//   testingRun: testPool
// });

testingHelper({
  network: Network.HYPERLIQUID,
  testingRun: testPool,
  onFork: false
});
