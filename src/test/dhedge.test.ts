import { Dhedge } from "..";
import { Network } from "../types";

import { testingHelper, TestingRunParams } from "./utils/testingHelper";

const testDhedge = ({ wallet, network }: TestingRunParams) => {
  let dhedge: Dhedge;

  jest.setTimeout(200000);

  describe(`dHEDGE on ${network}`, () => {
    beforeAll(async () => {
      dhedge = new Dhedge(wallet, network);
    });

    it("create a pool", async () => {
      const pool = await dhedge.createPool("Test", "Test", "TEST", [
        ["0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34", true],
        ["0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb", false],
        ["0x925a2A7214Ed92428B5b1B090F80b25700095e12", false]
      ]);
      console.log(pool.address);
      expect(pool.poolLogic.address).toBe(pool.address);
    });
  });
};

testingHelper({
  network: Network.PLASMA,
  onFork: false,
  testingRun: testDhedge
});
