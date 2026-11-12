import { ethers } from "ethers";
import ICoreWriterAbi from "../abi/hyperliquid/ICoreWriter.json";
import {
  getCancelOrderHyperliquidTxData,
  getRestingLimitOrderHyperliquidTxData
} from "../services/hyperliquid";

jest.mock("../services/hyperliquid/marketData", () => ({
  ...jest.requireActual("../services/hyperliquid/marketData"),
  getAssetInfo: jest.fn(async () => ({ assetName: "BTC", szDecimals: 5 }))
}));

const coreWriter = new ethers.utils.Interface(ICoreWriterAbi);

// Splits sendRawAction calldata into [version, actionId, params]
const decodeAction = (txData: string) => {
  const raw: string = coreWriter.decodeFunctionData("sendRawAction", txData)[0];
  const bytes = ethers.utils.arrayify(raw);
  return {
    version: bytes[0],
    actionId: (bytes[1] << 16) | (bytes[2] << 8) | bytes[3],
    params: ethers.utils.hexlify(bytes.slice(4))
  };
};

const ORDER_TYPES = [
  "uint32",
  "bool",
  "uint64",
  "uint64",
  "bool",
  "uint8",
  "uint128"
];

describe("hyperliquid resting limit orders", () => {
  it("encodes a GTC perp buy at the limit price with USD size", async () => {
    const tx = await getRestingLimitOrderHyperliquidTxData(
      0,
      true,
      1000,
      80000,
      "GTC"
    );
    const { version, actionId, params } = decodeAction(tx);
    expect(version).toBe(1);
    expect(actionId).toBe(1);
    const [
      asset,
      isBuy,
      px,
      sz,
      reduceOnly,
      tif,
      cloid
    ] = ethers.utils.defaultAbiCoder.decode(ORDER_TYPES, params);
    expect(asset).toBe(0);
    expect(isBuy).toBe(true);
    expect(px.toString()).toBe("8000000000000"); // 80000 * 1e8
    expect(sz.toString()).toBe("1250000"); // 1000 / 80000 = 0.0125 BTC * 1e8
    expect(reduceOnly).toBe(false);
    expect(tif).toBe(2); // GTC
    expect(cloid.toString()).toBe("0");
  });

  it("encodes a reduce-only ALO take-profit sell for a negative value", async () => {
    const tx = await getRestingLimitOrderHyperliquidTxData(
      0,
      true,
      -500,
      100000,
      "ALO"
    );
    const [
      ,
      isBuy,
      px,
      sz,
      reduceOnly,
      tif
    ] = ethers.utils.defaultAbiCoder.decode(
      ORDER_TYPES,
      decodeAction(tx).params
    );
    expect(isBuy).toBe(false);
    expect(px.toString()).toBe("10000000000000");
    expect(sz.toString()).toBe("500000"); // 0.005 BTC
    expect(reduceOnly).toBe(true);
    expect(tif).toBe(1); // ALO
  });

  it("rounds the limit price to 5 significant figures", async () => {
    const tx = await getRestingLimitOrderHyperliquidTxData(
      0,
      true,
      1000,
      81234.56,
      "GTC"
    );
    const [, , px] = ethers.utils.defaultAbiCoder.decode(
      ORDER_TYPES,
      decodeAction(tx).params
    );
    expect(px.toString()).toBe("8123500000000");
  });

  it("rejects resting spot buys", async () => {
    await expect(
      getRestingLimitOrderHyperliquidTxData(10107, true, 100, 1, "GTC")
    ).rejects.toThrow("Resting spot buy orders are not supported");
  });

  it("allows resting spot sells", async () => {
    const tx = await getRestingLimitOrderHyperliquidTxData(
      10107,
      true,
      -100,
      50,
      "GTC"
    );
    const [asset, isBuy, , , reduceOnly] = ethers.utils.defaultAbiCoder.decode(
      ORDER_TYPES,
      decodeAction(tx).params
    );
    expect(asset).toBe(10107);
    expect(isBuy).toBe(false);
    expect(reduceOnly).toBe(false);
  });

  it("rejects orders whose size rounds to zero", async () => {
    await expect(
      getRestingLimitOrderHyperliquidTxData(0, true, 0.0001, 80000, "GTC")
    ).rejects.toThrow("Order size rounds to zero");
  });

  it("encodes a cancel by oid", () => {
    const { actionId, params } = decodeAction(
      getCancelOrderHyperliquidTxData(5, "123456789")
    );
    expect(actionId).toBe(10);
    const [asset, oid] = ethers.utils.defaultAbiCoder.decode(
      ["uint32", "uint64"],
      params
    );
    expect(asset).toBe(5);
    expect(oid.toString()).toBe("123456789");
  });
});
