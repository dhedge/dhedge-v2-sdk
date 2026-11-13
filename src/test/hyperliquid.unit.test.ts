import { ethers } from "ethers";
import ICoreWriterAbi from "../abi/hyperliquid/ICoreWriter.json";
import { Pool } from "../entities/pool";
import {
  getCancelOrderByCloidHyperliquidTxData,
  getCancelOrderHyperliquidTxData,
  getLimitOrderHyperliquidTxData,
  getRestingLimitOrderHyperliquidTxData
} from "../services/hyperliquid";
import { CORE_WRITER_ADDRESS } from "../services/hyperliquid/constants";
import { getPositionSize } from "../services/hyperliquid/positionData";

jest.mock("../services/hyperliquid/marketData", () => ({
  ...jest.requireActual("../services/hyperliquid/marketData"),
  getAssetInfo: jest.fn(async () => ({ assetName: "BTC", szDecimals: 5 })),
  getMidPrice: jest.fn(async () => 80000)
}));

jest.mock("../services/hyperliquid/positionData", () => ({
  getPositionSize: jest.fn(async () => 1)
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

const TEST_CLOID = "0x1234567890abcdef1234567890abcdef";

const createTestPool = () => {
  const transaction = { hash: "0x1234" };
  const execTransaction = jest.fn().mockResolvedValue(transaction);
  const gas = ethers.BigNumber.from(21000);
  const estimateGas = jest.fn().mockResolvedValue(gas);
  const pool: Pool = Object.assign(Object.create(Pool.prototype), {
    address: "0x0000000000000000000000000000000000000001",
    isDhedge: true,
    poolLogic: {
      execTransaction,
      estimateGas: { execTransaction: estimateGas }
    }
  });
  return { pool, transaction, execTransaction, gas, estimateGas };
};

describe("hyperliquid market order compatibility", () => {
  it("preserves the original transaction options argument and return value", async () => {
    const transaction = { hash: "0x1234" };
    const execTransaction = jest.fn().mockResolvedValue(transaction);
    const pool: Pool = Object.assign(Object.create(Pool.prototype), {
      isDhedge: true,
      poolLogic: { execTransaction }
    });
    const options = { gasLimit: 100000 };

    const result = await pool.openMarketOrderHyperliquid(
      0,
      true,
      1000,
      0,
      options
    );

    expect(result).toBe(transaction);
    expect(execTransaction).toHaveBeenCalledWith(
      CORE_WRITER_ADDRESS,
      expect.any(String),
      options
    );
    const order = ethers.utils.defaultAbiCoder.decode(
      ORDER_TYPES,
      decodeAction(execTransaction.mock.calls[0][1]).params
    );
    expect(order[6].isZero()).toBe(true);
  });

  it("preserves the original boolean SDK options argument for gas estimation", async () => {
    const gas = ethers.BigNumber.from(21000);
    const estimateGas = jest.fn().mockResolvedValue(gas);
    const execTransaction = jest.fn();
    const pool: Pool = Object.assign(Object.create(Pool.prototype), {
      isDhedge: true,
      poolLogic: {
        execTransaction,
        estimateGas: { execTransaction: estimateGas }
      }
    });
    const options = { gasLimit: 100000 };

    const result = await pool.openMarketOrderHyperliquid(
      0,
      true,
      1000,
      0,
      options,
      true
    );

    expect(estimateGas).toHaveBeenCalledWith(
      CORE_WRITER_ADDRESS,
      expect.any(String),
      options
    );
    expect(result.gas).toBe(gas);
    expect(result.gasEstimationError).toBeNull();
    expect(execTransaction).not.toHaveBeenCalled();
  });

  it("preserves the original object SDK options argument for calldata-only mode", async () => {
    const pool: Pool = Object.create(Pool.prototype);
    const result = await pool.openMarketOrderHyperliquid(
      0,
      true,
      1000,
      0,
      null,
      { estimateGas: false, onlyGetTxData: true }
    );

    expect(result.to).toBe(CORE_WRITER_ADDRESS);
    const order = ethers.utils.defaultAbiCoder.decode(
      ORDER_TYPES,
      decodeAction(result.txData).params
    );
    expect(order[6].isZero()).toBe(true);
  });
});

describe("hyperliquid market order client IDs", () => {
  const cloid = "0x1234567890abcdef1234567890abcdef";

  it("forwards the full client ID and transaction options through the Pool method", async () => {
    const transaction = { hash: "0x1234" };
    const execTransaction = jest.fn().mockResolvedValue(transaction);
    const pool: Pool = Object.assign(Object.create(Pool.prototype), {
      isDhedge: true,
      poolLogic: { execTransaction }
    });
    const options = { gasLimit: 100000 };

    const result = await pool.openMarketOrderHyperliquidWithCloid(
      0,
      true,
      1000,
      0,
      cloid,
      options,
      { estimateGas: false }
    );

    expect(result).toBe(transaction);
    expect(execTransaction).toHaveBeenCalledWith(
      CORE_WRITER_ADDRESS,
      expect.any(String),
      options
    );
    const { version, actionId, params } = decodeAction(
      execTransaction.mock.calls[0][1]
    );
    const [
      asset,
      isBuy,
      price,
      size,
      reduceOnly,
      tif,
      clientOrderId
    ] = ethers.utils.defaultAbiCoder.decode(ORDER_TYPES, params);
    expect(version).toBe(1);
    expect(actionId).toBe(1);
    expect(asset).toBe(0);
    expect(isBuy).toBe(true);
    expect(price.toString()).toBe("8000000000000");
    expect(size.toString()).toBe("1250000");
    expect(reduceOnly).toBe(false);
    expect(tif).toBe(3);
    expect(clientOrderId.eq(ethers.BigNumber.from(cloid))).toBe(true);
  });

  it.each([1, 123456, Number.MAX_SAFE_INTEGER])(
    "encodes a numeric client ID through the Pool method: %s",
    async numericCloid => {
      const pool: Pool = Object.create(Pool.prototype);
      const result = await pool.openMarketOrderHyperliquidWithCloid(
        0,
        true,
        1000,
        0,
        numericCloid,
        null,
        { estimateGas: false, onlyGetTxData: true }
      );
      const order = ethers.utils.defaultAbiCoder.decode(
        ORDER_TYPES,
        decodeAction(result.txData).params
      );
      expect(order[6].toString()).toBe(numericCloid.toString());
    }
  );

  it.each([undefined, 0, "", `0x${"0".repeat(32)}`])(
    "supports calldata-only mode without a client ID: %s",
    async zeroCloid => {
      const pool: Pool = Object.create(Pool.prototype);
      const result = await pool.openMarketOrderHyperliquidWithCloid(
        0,
        true,
        1000,
        0,
        zeroCloid,
        null,
        { estimateGas: false, onlyGetTxData: true }
      );

      expect(result.to).toBe(CORE_WRITER_ADDRESS);
      const [
        ,
        ,
        ,
        ,
        ,
        tif,
        clientOrderId
      ] = ethers.utils.defaultAbiCoder.decode(
        ORDER_TYPES,
        decodeAction(result.txData).params
      );
      expect(tif).toBe(3);
      expect(clientOrderId.isZero()).toBe(true);
    }
  );

  it.each([
    "not-a-cloid",
    "0x1234",
    `0x${"f".repeat(34)}`,
    `0x${"g".repeat(32)}`,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
    Infinity
  ])("rejects an invalid client ID: %s", async invalidCloid => {
    await expect(
      getLimitOrderHyperliquidTxData(0, true, 1000, 0, invalidCloid)
    ).rejects.toThrow(
      "cloid must be a non-negative safe integer or a 16-byte hex string"
    );
  });
});

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

describe("hyperliquid resting limit order client IDs", () => {
  it.each([
    { tif: "GTC" as const, cloid: 123456 },
    { tif: "ALO" as const, cloid: 123456 },
    { tif: "GTC" as const, cloid: TEST_CLOID },
    { tif: "ALO" as const, cloid: TEST_CLOID }
  ])("encodes a $tif order with client ID $cloid", async ({ tif, cloid }) => {
    const { pool, transaction, execTransaction } = createTestPool();
    const options = { gasLimit: 100000 };
    const result = await pool.openLimitOrderHyperliquidWithCloid(
      0,
      true,
      -1000,
      80000,
      tif,
      cloid,
      options,
      { estimateGas: false }
    );

    expect(result).toBe(transaction);
    expect(execTransaction).toHaveBeenCalledWith(
      CORE_WRITER_ADDRESS,
      expect.any(String),
      options
    );
    const { actionId, params } = decodeAction(execTransaction.mock.calls[0][1]);
    const order = ethers.utils.defaultAbiCoder.decode(ORDER_TYPES, params);
    expect(actionId).toBe(1);
    expect(order[1]).toBe(false);
    expect(order[4]).toBe(true);
    expect(order[5]).toBe(tif === "ALO" ? 1 : 2);
    expect(order[6].toString()).toBe(ethers.BigNumber.from(cloid).toString());
  });

  it("allows spot sells with a client ID and without reduceOnly", async () => {
    const { pool, execTransaction } = createTestPool();
    await pool.openLimitOrderHyperliquidWithCloid(
      10000,
      true,
      -100,
      50,
      "GTC",
      TEST_CLOID
    );

    const order = ethers.utils.defaultAbiCoder.decode(
      ORDER_TYPES,
      decodeAction(execTransaction.mock.calls[0][1]).params
    );
    expect(order[0]).toBe(10000);
    expect(order[1]).toBe(false);
    expect(order[4]).toBe(false);
    expect(order[6].eq(ethers.BigNumber.from(TEST_CLOID))).toBe(true);
  });

  it("still rejects resting spot buys when a client ID is supplied", async () => {
    const { pool, execTransaction } = createTestPool();
    await expect(
      pool.openLimitOrderHyperliquidWithCloid(
        10000,
        true,
        100,
        50,
        "GTC",
        TEST_CLOID
      )
    ).rejects.toThrow("Resting spot buy orders are not supported");
    expect(execTransaction).not.toHaveBeenCalled();
  });

  it("defaults to GTC without a client ID", async () => {
    const { pool, execTransaction } = createTestPool();
    await pool.openLimitOrderHyperliquidWithCloid(0, true, 1000, 80000);

    const order = ethers.utils.defaultAbiCoder.decode(
      ORDER_TYPES,
      decodeAction(execTransaction.mock.calls[0][1]).params
    );
    expect(order[5]).toBe(2);
    expect(order[6].isZero()).toBe(true);
  });

  it("preserves the original resting-order options arguments", async () => {
    const { pool, transaction, execTransaction } = createTestPool();
    const options = { gasLimit: 100000 };
    const result = await pool.openLimitOrderHyperliquid(
      0,
      true,
      1000,
      80000,
      "ALO",
      options,
      { estimateGas: false }
    );

    expect(result).toBe(transaction);
    expect(execTransaction).toHaveBeenCalledWith(
      CORE_WRITER_ADDRESS,
      expect.any(String),
      options
    );
    const order = ethers.utils.defaultAbiCoder.decode(
      ORDER_TYPES,
      decodeAction(execTransaction.mock.calls[0][1]).params
    );
    expect(order[5]).toBe(1);
    expect(order[6].isZero()).toBe(true);
  });
});

describe("hyperliquid position-closing client IDs", () => {
  it.each([
    { assetId: 0, position: 1, isBuy: false, reduceOnly: true, cloid: 123456 },
    {
      assetId: 0,
      position: -1,
      isBuy: true,
      reduceOnly: true,
      cloid: TEST_CLOID
    },
    {
      assetId: 10000,
      position: 2,
      isBuy: false,
      reduceOnly: false,
      cloid: TEST_CLOID
    }
  ])(
    "closes position $position on asset $assetId with a client ID",
    async test => {
      const { pool, transaction, execTransaction } = createTestPool();
      const options = { gasLimit: 100000 };
      jest.mocked(getPositionSize).mockResolvedValueOnce(test.position);
      const result = await pool.closePositionHyperliquidWithCloid(
        test.assetId,
        50,
        0,
        test.cloid,
        options,
        { estimateGas: false }
      );

      expect(result).toBe(transaction);
      expect(execTransaction).toHaveBeenCalledWith(
        CORE_WRITER_ADDRESS,
        expect.any(String),
        options
      );
      expect(getPositionSize).toHaveBeenCalledWith(
        test.assetId,
        test.assetId === 10000,
        "BTC",
        pool.address
      );
      const { actionId, params } = decodeAction(
        execTransaction.mock.calls[0][1]
      );
      const order = ethers.utils.defaultAbiCoder.decode(ORDER_TYPES, params);
      expect(actionId).toBe(1);
      expect(order[0]).toBe(test.assetId);
      expect(order[1]).toBe(test.isBuy);
      expect(order[3].toString()).toBe(
        ethers.BigNumber.from(Math.abs(test.position) * 50000000).toString()
      );
      expect(order[4]).toBe(test.reduceOnly);
      expect(order[5]).toBe(3);
      expect(order[6].toString()).toBe(
        ethers.BigNumber.from(test.cloid).toString()
      );
    }
  );

  it("defaults to closing the full position without a client ID", async () => {
    const { pool, execTransaction } = createTestPool();
    await pool.closePositionHyperliquidWithCloid(0);

    const order = ethers.utils.defaultAbiCoder.decode(
      ORDER_TYPES,
      decodeAction(execTransaction.mock.calls[0][1]).params
    );
    expect(order[3].toString()).toBe("100000000");
    expect(order[6].isZero()).toBe(true);
  });

  it("preserves the original closing options and boolean SDK options", async () => {
    const { pool, gas, estimateGas, execTransaction } = createTestPool();
    const options = { gasLimit: 100000 };
    const result = await pool.closePositionHyperliquid(0, 50, 0, options, true);

    expect(result.gas).toBe(gas);
    expect(estimateGas).toHaveBeenCalledWith(
      CORE_WRITER_ADDRESS,
      expect.any(String),
      options
    );
    expect(execTransaction).not.toHaveBeenCalled();
    const order = ethers.utils.defaultAbiCoder.decode(
      ORDER_TYPES,
      decodeAction(result.txData).params
    );
    expect(order[6].isZero()).toBe(true);
  });
});

describe("hyperliquid cancellation by client ID", () => {
  it.each([123456, Number.MAX_SAFE_INTEGER, TEST_CLOID, `0x${"f".repeat(32)}`])(
    "cancels by client ID without truncation: %s",
    async cloid => {
      const { pool, transaction, execTransaction } = createTestPool();
      const options = { gasLimit: 100000 };
      const result = await pool.cancelOrderByCloidHyperliquid(
        0,
        cloid,
        options
      );

      expect(result).toBe(transaction);
      expect(execTransaction).toHaveBeenCalledWith(
        CORE_WRITER_ADDRESS,
        expect.any(String),
        options
      );
      const { version, actionId, params } = decodeAction(
        execTransaction.mock.calls[0][1]
      );
      const [asset, clientOrderId] = ethers.utils.defaultAbiCoder.decode(
        ["uint32", "uint128"],
        params
      );
      expect(version).toBe(1);
      expect(actionId).toBe(11);
      expect(asset).toBe(0);
      expect(clientOrderId.toString()).toBe(
        ethers.BigNumber.from(cloid.toString()).toString()
      );
    }
  );

  it("supports calldata-only cancellation", async () => {
    const { pool, execTransaction } = createTestPool();
    const result = await pool.cancelOrderByCloidHyperliquid(
      0,
      TEST_CLOID,
      null,
      { estimateGas: false, onlyGetTxData: true }
    );

    expect(result.to).toBe(CORE_WRITER_ADDRESS);
    expect(decodeAction(result.txData).actionId).toBe(11);
    expect(execTransaction).not.toHaveBeenCalled();
  });

  it("preserves OID cancellation and its options arguments", async () => {
    const { pool, transaction, execTransaction } = createTestPool();
    const options = { gasLimit: 100000 };
    const result = await pool.cancelOrderHyperliquid(5, "123456789", options, {
      estimateGas: false
    });

    expect(result).toBe(transaction);
    expect(execTransaction).toHaveBeenCalledWith(
      CORE_WRITER_ADDRESS,
      expect.any(String),
      options
    );
    const { actionId, params } = decodeAction(execTransaction.mock.calls[0][1]);
    const [asset, oid] = ethers.utils.defaultAbiCoder.decode(
      ["uint32", "uint64"],
      params
    );
    expect(actionId).toBe(10);
    expect(asset).toBe(5);
    expect(oid.toString()).toBe("123456789");
  });

  it.each([0, "", `0x${"0".repeat(32)}`])(
    "rejects cancellation without a client ID: %s",
    cloid => {
      expect(() => getCancelOrderByCloidHyperliquidTxData(0, cloid)).toThrow(
        "cloid must be non-zero for cancellation"
      );
    }
  );

  it.each([
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
    Infinity,
    "not-a-cloid",
    "0x1234",
    `0x${"f".repeat(34)}`,
    `0x${"g".repeat(32)}`
  ])("rejects invalid cancellation client ID: %s", cloid => {
    expect(() => getCancelOrderByCloidHyperliquidTxData(0, cloid)).toThrow(
      "cloid must be a non-negative safe integer or a 16-byte hex string"
    );
  });
});
