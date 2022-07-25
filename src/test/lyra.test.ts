import { Dhedge } from "..";
import { getExpiries, getStrike } from "../services/lyra/markets";
import { Network } from "../types";
import { wallet } from "./wallet";

jest.setTimeout(100000);

describe("pool", () => {
  let dhedge: Dhedge;
  beforeAll(async () => {
    dhedge = new Dhedge(wallet, Network.OPTIMISM_KOVAN);
  });

  it("get option expiries", async () => {
    let result;
    try {
      result = await getExpiries("ETH", dhedge.network, dhedge.signer);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });

  it("gets a strike ID", async () => {
    let result;
    try {
      result = await getStrike(
        "ETH",
        1750,
        1660744800,
        dhedge.network,
        dhedge.signer
      );
      console.log(result);
    } catch (e) {
      console.log(e);
    }
    expect(result).not.toBe(null);
  });
});
