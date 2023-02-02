import { Dhedge, ethers, Pool } from "..";
import { AssetEnabled, Network } from "../types";
import { CONTRACT_ADDRESS, TEST_POOL } from "./constants";
import { allowanceDelta, balanceDelta } from "./utils/token";
import { wallet } from "./wallet";

let dhedge: Dhedge;
let pool: Pool;

jest.setTimeout(100000);

const network = Network.POLYGON;

describe("pool", () => {
  beforeAll(async () => {
    dhedge = new Dhedge(wallet, network);
    pool = await dhedge.loadPool(TEST_POOL[network]);
  });

  it("checks fund composition", async () => {
    const result = await pool.getComposition();
    expect(result.length).toBeGreaterThan(0);
  });

  it("approves USDC balance of User for Deposit", async () => {
    await pool.approveDeposit(
      CONTRACT_ADDRESS[network].USDC,
      ethers.constants.MaxUint256
    );
    const UsdcAllowanceDelta = await allowanceDelta(
      pool.signer.address,
      CONTRACT_ADDRESS[network].USDC,
      pool.address,
      pool.signer
    );
    expect(UsdcAllowanceDelta.gt(0));
  });

  it("deposits 1 USDC into Pool", async () => {
    await pool.deposit(CONTRACT_ADDRESS[network].USDC, (1e6).toString());
    const poolTokenDelta = await balanceDelta(
      pool.signer.address,
      pool.address,
      pool.signer
    );
    expect(poolTokenDelta.gt(0));
  });

  it("adds WBTC to enabled assets", async () => {
    const assetsBefore = await pool.getComposition();
    const newAssets: AssetEnabled[] = [
      { asset: CONTRACT_ADDRESS[network].USDC, isDeposit: true },
      { asset: CONTRACT_ADDRESS[network].WETH, isDeposit: false },
      { asset: CONTRACT_ADDRESS[network].WBTC, isDeposit: false }
    ];
    await pool.changeAssets(newAssets);
    const assetsAfter = await pool.getComposition();
    expect(assetsAfter.length).toBeGreaterThan(assetsBefore.length);
  });
});
