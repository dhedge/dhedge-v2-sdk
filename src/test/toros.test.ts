/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dhedge, Pool } from "..";
import { routerAddress } from "../config";
import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL } from "./constants";
import { allowanceDelta, balanceDelta } from "./utils/token";

import { wallet } from "./wallet";

const ETHy = "0xb2cfb909e8657c0ec44d3dd898c1053b87804755";
const network = Network.OPTIMISM;
const SUSD = CONTRACT_ADDRESS[network].SUSD;

let dhedge: Dhedge;
let pool: Pool;
jest.setTimeout(100000);

describe("pool", () => {
  beforeAll(async () => {
    dhedge = new Dhedge(wallet, network);
    pool = await dhedge.loadPool(TEST_POOL[network]);
  });

  it("approves unlimited ETHy on Toros (Easyswapper)", async () => {
    await pool.approve(Dapp.TOROS, ETHy, MAX_AMOUNT);
    const ETHyAllowanceDelta = await allowanceDelta(
      pool.address,
      ETHy,
      routerAddress[network].toros!,
      pool.signer
    );
    expect(ETHyAllowanceDelta.gt(0));
  });

  it("sell ETHy to SUSD on Toros", async () => {
    const ETHyBalance = await pool.utils.getBalance(ETHy, pool.address);
    await pool.trade(Dapp.TOROS, ETHy, SUSD, ETHyBalance, 3);
    const ETHyBalanceDelta = await balanceDelta(
      pool.address,
      SUSD,
      pool.signer
    );
    expect(ETHyBalanceDelta.lt(0));
  });

  it("approves unlimited sUSD on Toros (Easyswapper)", async () => {
    await pool.approve(Dapp.TOROS, SUSD, MAX_AMOUNT, { gasLimit: "3000000" });
    const sUSDAllowanceDelta = await allowanceDelta(
      pool.address,
      SUSD,
      routerAddress[network].toros!,
      pool.signer
    );
    expect(sUSDAllowanceDelta.gt(0));
  });

  it("buys ETHy for 3 sUSD", async () => {
    await pool.trade(Dapp.TOROS, SUSD, ETHy, (3 * 10e18).toString(), 3, {
      gasLimit: "3000000"
    });
    const ETHyBalanceDelta = await balanceDelta(
      pool.address,
      ETHy,
      pool.signer
    );
    expect(ETHyBalanceDelta.gt(0));
  });
});
