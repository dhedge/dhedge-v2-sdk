import { walletConfig, factoryAddress } from "../config";
import { Network } from "../types";

import { Dhedge } from "./dhedge";
// const myPool = "0xfb1314b51b4f117c77dd03c3486b4a4f3ee0f25d";
// const usdc = "0x9D4Dc547d9c1822aEd5b6e19025894d1B7A54036";
// const weth = "0x21d867E9089d07570c682B9186697E2E326CEc8a";

jest.setTimeout(100000);

describe("dhedge", () => {
  it("loads factory", () => {
    const dhedge = new Dhedge(
      "https://polygon-mainnet.infura.io/v3/3b08f5d1428043ba9e4c7dbe63d26849",
      Network.POLYGON,
      "658781b4aa46a78f6518a8b28c96a11800ef2a4b307e9563d391ff32d268b49a"
    );
    const factory = dhedge.factory;
    expect(factory.address).toBe(factoryAddress[walletConfig.network]);
  });

  // it("loads a pool by address", async () => {
  //   const dhedge = new Dhedge(
  //     "https://polygon-mainnet.infura.io/v3/3b08f5d1428043ba9e4c7dbe63d26849",
  //     Network.,
  //     "658781b4aa46a78f6518a8b28c96a11800ef2a4b307e9563d391ff32d268b49a"
  //   );
  //   const pool = await dhedge.loadPool(myPool);
  //   expect(pool.poolLogic.address).toBe(myPool);
  // });

  // it("create a pool", async () => {
  //   const dhedge = new Dhedge();
  //   const pool = await dhedge.createPool("Batman", "Gotham Pool", "DHHH", [
  //     [usdc, true],
  //     [weth, true]
  //   ]);
  //   expect(pool.poolLogic.address).toBe(pool.address);
  // });
});
