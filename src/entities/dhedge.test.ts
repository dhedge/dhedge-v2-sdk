import { walletConfig, factoryAddress } from "../config";

import { Dhedge } from "./dhedge";
const myPool = "0xfb1314b51b4f117c77dd03c3486b4a4f3ee0f25d";

describe("dhedge", () => {
  it("loads factory", () => {
    const dhedge = new Dhedge();
    const factory = dhedge.factory;
    expect(factory.address).toBe(factoryAddress[walletConfig.network]);
  });

  it("loads a pool by address", async () => {
    const dhedge = new Dhedge();
    const pool = await dhedge.loadPool(myPool);
    expect(pool.poolLogic.address).toBe(myPool);
  });
});



describe("dhedge", () => {
  it("loads factory", () => {
    const dhedge = new Dhedge();
    const factory = dhedge.factory;
    expect(factory.address).toBe(factoryAddress[walletConfig.network]);
  });

  it("create a pool", async () => {
    const dhedge = new Dhedge();
    const pool = await dhedge.createPool(false, "Batman", "Gotham Pool");
    expect(pool.poolLogic.address).toBe(pool.address);
  });
});
