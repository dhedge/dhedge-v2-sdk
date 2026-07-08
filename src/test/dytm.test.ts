/* eslint-disable @typescript-eslint/no-non-null-assertion */

import BigNumber from "bignumber.js";
import { BigNumber as EthersBigNumber, Contract, providers } from "ethers";
import { Dhedge, Pool } from "..";
import { Dapp, Network } from "../types";
import { CONTRACT_ADDRESS, MAX_AMOUNT } from "./constants";
import {
  TestingRunParams,
  runWithImpersonateAccount,
  setTokenAmount,
  setUSDCAmount,
  testingHelper
} from "./utils/testingHelper";
import { balanceDelta } from "./utils/token";
import { routerAddress } from "../config";

const officeAbi = [
  "function getMarketConfig(uint88 market) view returns (address marketConfig)"
];
const marketConfigAbi = ["function hooks() view returns (address hooks)"];
const borrowerWhitelistAbi = [
  "function owner() view returns (address)",
  "function setAddressWhitelist(address accountOwner, bool allowed)"
];
const erc20AllowanceAbi = [
  "function allowance(address owner, address spender) view returns (uint256)"
];

const DYTM_MARKET_ID = 1;
// ReserveKey: (marketId uint88 << 160) | asset address — DYTM src/types/ReserveKey.sol
const toReserveKey = (marketId: number, asset: string): EthersBigNumber =>
  EthersBigNumber.from(marketId)
    .shl(160)
    .or(asset);
// full tokenId: (TokenType << 248) | reserveKey — DYTM src/libraries/TokenHelpers.sol
// TokenType: ESCROW = 1, LEND = 2, DEBT = 3
const toLentId = (key: EthersBigNumber): EthersBigNumber =>
  EthersBigNumber.from(2)
    .shl(248)
    .or(key);
const toEscrowId = (key: EthersBigNumber): EthersBigNumber =>
  EthersBigNumber.from(1)
    .shl(248)
    .or(key);

// SPYon (Ondo) collateral on mainnet market 1
const SPYON_MAINNET = "0xFeDC5f4a6c38211c1338aa411018DFAf26612c08";
const SPYON_BALANCEOF_SLOT = 51; // OZ ERC20Upgradeable layout

// market 1 borrows are gated by the BorrowerWhitelist hook — impersonate its
// owner and whitelist the pool
const whitelistPoolAsBorrower = async ({
  pool,
  network,
  provider
}: {
  pool: Pool;
  network: Network;
  provider: providers.JsonRpcProvider;
}): Promise<void> => {
  const office = new Contract(
    routerAddress[network][Dapp.DYTM]!,
    officeAbi,
    provider
  );
  const marketConfigAddress = await office.getMarketConfig(DYTM_MARKET_ID);
  const hookAddress = await new Contract(
    marketConfigAddress,
    marketConfigAbi,
    provider
  ).hooks();
  const hook = new Contract(hookAddress, borrowerWhitelistAbi, provider);
  const hookOwner = await hook.owner();
  await runWithImpersonateAccount(
    { account: hookOwner, provider },
    async ({ signer }) => {
      await hook.connect(signer).setAddressWhitelist(pool.address, true);
    }
  );
};

const testDytm = ({ network, wallet, provider }: TestingRunParams) => {
  const USDC = CONTRACT_ADDRESS[network].USDC;
  const usdcKey = toReserveKey(DYTM_MARKET_ID, USDC);
  // supply/withdraw take the full LEND tokenId; borrow/repay take the bare ReserveKey
  const USDC_DEPOSIT_TOKEN = toLentId(usdcKey).toString();
  const USDC_BORROW_TOKEN = usdcKey.toString();

  const USDC_FUNDING_AMOUNT = new BigNumber(100).shiftedBy(6).toFixed(0);
  const USDC_LIQUIDITY_AMOUNT = new BigNumber(50).shiftedBy(6).toFixed(0);

  // the asset backing the borrow differs per network: on arbitrum lent USDC
  // counts as collateral, on mainnet USDC has lend weight 0 and SPYon escrow
  // collateral (weight 0.75) is required instead
  const collateral =
    network === Network.ETHEREUM
      ? {
          asset: SPYON_MAINNET,
          tokenId: toEscrowId(
            toReserveKey(DYTM_MARKET_ID, SPYON_MAINNET)
          ).toString(),
          supplyAmount: new BigNumber(1).shiftedBy(18).toFixed(0),
          // SPYon isn't covered by the USDC funding — deal it via its balanceOf slot
          funding: {
            slot: SPYON_BALANCEOF_SLOT,
            amount: new BigNumber(10).shiftedBy(18).toFixed(0)
          }
        }
      : {
          asset: USDC,
          tokenId: USDC_DEPOSIT_TOKEN,
          supplyAmount: USDC_LIQUIDITY_AMOUNT,
          funding: null // covered by the USDC funded in beforeAll
        };

  let dhedge: Dhedge;
  let pool: Pool;
  jest.setTimeout(100000);

  describe(`[${network}] DYTM tests`, () => {
    beforeAll(async () => {
      // top up ETH (gas)
      await provider.send("hardhat_setBalance", [
        wallet.address,
        "0x100000000000000"
      ]);
      // mine a local block so eth_calls run under hardhat's own hardfork —
      // the remote fork-point block executes as london (hardforkHistory) and
      // lacks the cancun opcodes DYTM needs (transient storage)
      await provider.send("evm_mine", []);
      dhedge = new Dhedge(wallet, network);
      pool = await dhedge.loadPool(wallet.address, false);

      await whitelistPoolAsBorrower({ pool, network, provider });

      // fund USDC and supply half of it as market liquidity to be borrowed
      await setUSDCAmount({
        amount: USDC_FUNDING_AMOUNT,
        userAddress: pool.address,
        network,
        provider
      });
      await pool.approve(Dapp.DYTM, USDC, MAX_AMOUNT);
      await pool.lend(Dapp.DYTM, USDC_DEPOSIT_TOKEN, USDC_LIQUIDITY_AMOUNT);

      // fund the collateral asset for the supply tests
      if (collateral.funding) {
        await setTokenAmount({
          amount: collateral.funding.amount,
          userAddress: pool.address,
          tokenAddress: collateral.asset,
          slot: collateral.funding.slot,
          provider
        });
      }
    });

    it("approves unlimited collateral for DYTM", async () => {
      await pool.approve(Dapp.DYTM, collateral.asset, MAX_AMOUNT);
      const allowance = await new Contract(
        collateral.asset,
        erc20AllowanceAbi,
        provider
      ).allowance(pool.address, routerAddress[network][Dapp.DYTM]!);
      expect(allowance.eq(MAX_AMOUNT)).toBe(true);
    });

    it("estimates supplying collateral to DYTM market", async () => {
      const result = await pool.lend(
        Dapp.DYTM,
        collateral.tokenId,
        collateral.supplyAmount,
        0,
        null,
        true
      );
      expect(result.gas.gt(0)).toBe(true);
    });

    it("supplies collateral to DYTM market", async () => {
      await pool.lend(Dapp.DYTM, collateral.tokenId, collateral.supplyAmount);

      const collateralDelta = await balanceDelta(
        pool.address,
        collateral.asset,
        pool.signer
      );
      expect(collateralDelta.lt(0)).toBe(true);
    });

    it("borrows USDC from DYTM market", async () => {
      // borrow value must clear the market's minDebtAmountUSD ($1 on arbitrum);
      // borrow 3 USDC so the ~2 USDC debt left after the repay test stays above it
      await pool.borrow(Dapp.DYTM, USDC_BORROW_TOKEN, (3 * 1e6).toString());

      const usdcTokenDelta = await balanceDelta(
        pool.address,
        USDC,
        pool.signer
      );
      expect(usdcTokenDelta.gt(0)).toBe(true);
    });

    it("repays USDC to DYTM market", async () => {
      await pool.repay(Dapp.DYTM, USDC_BORROW_TOKEN, (1 * 1e6).toString());

      const usdcTokenDelta = await balanceDelta(
        pool.address,
        USDC,
        pool.signer
      );
      expect(usdcTokenDelta.lt(0)).toBe(true);
    });

    it("withdraws USDC from DYTM market", async () => {
      await pool.withdrawDeposit(
        Dapp.DYTM,
        USDC_DEPOSIT_TOKEN,
        (5 * 1e6).toString()
      );

      const usdcTokenDelta = await balanceDelta(
        pool.address,
        USDC,
        pool.signer
      );
      expect(usdcTokenDelta.gt(0)).toBe(true);
    });
  });
};

testingHelper({
  network: Network.ETHEREUM,
  testingRun: testDytm
});
