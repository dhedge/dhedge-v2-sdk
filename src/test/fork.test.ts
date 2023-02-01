import { forkForTest } from "./fork";

jest.setTimeout(100000);

// const options = {
//   gasLimit: 5000000,
//   gasPrice: ethers.utils.parseUnits("35", "gwei")
// };

describe("pool", () => {
  it("should test fork", async () => {
    console.log(globalThis);
    const test = await forkForTest({ network_id: "10" });
    console.log(test);
    expect(test).not.toBe(null);
  });
});
