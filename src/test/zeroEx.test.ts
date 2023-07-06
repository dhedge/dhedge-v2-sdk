/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ethers } from "ethers";
import { routerAddress } from "../config";
import { Dhedge, Pool } from "../entities";
import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT, TEST_POOL_FOR_0X } from "./constants";
import IERC20 from "../abi/IERC20.json";
import { balanceDelta } from "./utils/token";
import "dotenv/config";
import { getTxOptions } from "./txOptions";

jest.setTimeout(100000);

describe("[Polygon], pool trade via 0x", () => {
  let network: Network;
  let dhedge: Dhedge;
  let pool: Pool;
  let USDC: string;
  let WETH: string;
  let ZeroExProxy: string;
  beforeAll(async () => {
    const provider = new ethers.providers.JsonRpcProvider(
      `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
    );
    const wallet = new ethers.Wallet(
      process.env.PRIVATE_KEY as string,
      provider
    );
    network = Network.POLYGON;
    USDC = CONTRACT_ADDRESS[network].USDC;
    WETH = CONTRACT_ADDRESS[network].WETH;

    ZeroExProxy = routerAddress[network][Dapp.ZEROEX]!;
    dhedge = new Dhedge(wallet, network);
    pool = await dhedge.loadPool(TEST_POOL_FOR_0X[network]);
  });

  it("[Polygon] approves unlimited USDC on 0x", async () => {
    const assetContract = new ethers.Contract(USDC, IERC20.abi, pool.signer);
    const allowanceBefore = await assetContract.allowance(
      pool.address,
      ZeroExProxy
    );
    if (ethers.constants.Zero.eq(allowanceBefore)) {
      const options = await getTxOptions(network);
      const approveTx = await pool.approve(
        Dapp.ZEROEX,
        USDC,
        MAX_AMOUNT,
        options
      );
      await approveTx.wait(1);
    }
    const allowanceAfter = await assetContract.allowance(
      pool.address,
      ZeroExProxy
    );
    await expect(allowanceAfter.gt(0));
  });

  it("[Polygon] trades 1 USDC into WETH on 0x,  with amountIn as string", async () => {
    const options = await getTxOptions(network);
    const tradeTx = await pool.trade(
      Dapp.ZEROEX,
      USDC,
      WETH,
      "1000000",
      0.5,
      options
    );
    await tradeTx.wait(1);
    const wethBalanceDelta = await balanceDelta(
      pool.address,
      WETH,
      pool.signer
    );
    expect(wethBalanceDelta.gt(0));
  });

  it("[Polygon] trades 1 USDC into WETH on 0x, with amountIn as BigNumber", async () => {
    const options = await getTxOptions(network);
    const tradeTx = await pool.trade(
      Dapp.ZEROEX,
      USDC,
      WETH,
      ethers.BigNumber.from(1000000),
      0.5,
      options
    );
    await tradeTx.wait(1);
    const wethBalanceDelta = await balanceDelta(
      pool.address,
      WETH,
      pool.signer
    );
    expect(wethBalanceDelta.gt(0));
  });
});

describe("[Optimism], pool trade via 0x", () => {
  let network: Network;
  let dhedge: Dhedge;
  let pool: Pool;
  let USDC: string;
  let WETH: string;
  let ZeroExProxy: string;
  beforeAll(async () => {
    const provider = new ethers.providers.JsonRpcProvider(
      `https://optimism-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
    );
    const wallet = new ethers.Wallet(
      process.env.PRIVATE_KEY as string,
      provider
    );
    network = Network.OPTIMISM;
    USDC = CONTRACT_ADDRESS[network].USDC;
    WETH = CONTRACT_ADDRESS[network].WETH;

    ZeroExProxy = routerAddress[network][Dapp.ZEROEX]!;
    dhedge = new Dhedge(wallet, network);
    pool = await dhedge.loadPool(TEST_POOL_FOR_0X[network]);
  });

  it("[Optimism] approves unlimited USDC on 0x", async () => {
    const assetContract = new ethers.Contract(USDC, IERC20.abi, pool.signer);
    const allowanceBefore = await assetContract.allowance(
      pool.address,
      ZeroExProxy
    );
    if (ethers.constants.Zero.eq(allowanceBefore)) {
      const options = await getTxOptions(network);
      const approveTx = await pool.approve(
        Dapp.ZEROEX,
        USDC,
        MAX_AMOUNT,
        options
      );
      await approveTx.wait(1);
    }
    const allowanceAfter = await assetContract.allowance(
      pool.address,
      ZeroExProxy
    );
    await expect(allowanceAfter.gt(0));
  });

  it("[Optimism] trades 1 USDC into WETH on 0x,  with amountIn as string", async () => {
    const options = await getTxOptions(network);
    const tradeTx = await pool.trade(
      Dapp.ZEROEX,
      USDC,
      WETH,
      "1000000",
      0.5,
      options
    );
    await tradeTx.wait(1);
    const wethBalanceDelta = await balanceDelta(
      pool.address,
      WETH,
      pool.signer
    );
    expect(wethBalanceDelta.gt(0));
  });

  it("[Optimism] trades 1 USDC into WETH on 0x, with amountIn as BigNumber", async () => {
    const options = await getTxOptions(network);
    const tradeTx = await pool.trade(
      Dapp.ZEROEX,
      USDC,
      WETH,
      ethers.BigNumber.from(1000000),
      0.5,
      options
    );
    await tradeTx.wait(1);
    const wethBalanceDelta = await balanceDelta(
      pool.address,
      WETH,
      pool.signer
    );
    expect(wethBalanceDelta.gt(0));
  });
});
