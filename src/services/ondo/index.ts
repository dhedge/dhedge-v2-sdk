import axios from "axios";
import { ethers } from "ethers";
import BigNumber from "bignumber.js";
import { Pool } from "../..";
import IOndoGMSwap from "../../abi/ondo/IOndoGMSwap.json";

const ONDO_API_URL = "https://api.gm.ondo.finance/v1/attestations";

// Ethereum mainnet USDC — Ondo is Ethereum-only
const USDC_ETHEREUM = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

type OndoAttestation = {
  attestationId: string;
  userId: string;
  chainId: string;
  assetAddress: string;
  side: string;
  tokenAmount: string;
  price: string;
  expiration: number;
  signature: string;
  additionalData: string;
};

const iface = new ethers.utils.Interface(IOndoGMSwap);

// Ondo returns userId as a left-aligned 32-byte hex (significant bytes first,
// e.g. 0x474d...0000), so right-pad to preserve byte order and fix it to 32 bytes.
function toBytes32(s: string): string {
  const hex = s.startsWith("0x") ? s.slice(2) : s;
  return "0x" + hex.padEnd(64, "0").slice(0, 64);
}

async function fetchUsdcPriceD18(pool: Pool): Promise<BigNumber> {
  const assetHandlerAddress = await pool.factory.callStatic.getAssetHandler();
  const assetHandler = new ethers.Contract(
    assetHandlerAddress,
    ["function getUSDPrice(address) view returns (uint256)"],
    pool.signer
  );
  return new BigNumber(
    (await assetHandler.getUSDPrice(USDC_ETHEREUM)).toString()
  );
}

async function postOndoAttestation(
  symbol: string,
  side: "buy" | "sell",
  amount: { notionalValue: string } | { tokenAmount: string },
  apiKey: string
): Promise<OndoAttestation> {
  try {
    const { data } = await axios.post(
      ONDO_API_URL,
      { chainId: "ethereum-1", symbol, side, ...amount, duration: "short" },
      { headers: { "x-api-key": apiKey } }
    );
    return data as OndoAttestation;
  } catch (error) {
    // Surface Ondo's structured error (e.g. ASSET_NOT_FOUND, MARKET_CLOSED)
    if (axios.isAxiosError(error) && error.response) {
      const { code, message } = error.response.data ?? {};
      throw new Error(
        `Ondo attestation request failed (${error.response.status}): ${code ??
          ""} ${message ?? JSON.stringify(error.response.data)}`.trim()
      );
    }
    throw error;
  }
}

export async function getOndoSwapTxData(
  pool: Pool,
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  slippage: number
): Promise<{ swapTxData: string; minAmountOut: string }> {
  const apiKey = process.env.ONDO_API_KEY;
  if (!apiKey) throw new Error("ONDO_API_KEY environment variable is not set");

  const amount = new BigNumber(amountIn);
  const isMint = tokenIn.toLowerCase() === USDC_ETHEREUM.toLowerCase();
  const gmToken = isMint ? tokenOut : tokenIn;
  const slippageBps = Math.round(slippage * 100);

  const tokenContract = new ethers.Contract(
    gmToken,
    ["function symbol() view returns (string)"],
    pool.signer
  );
  const symbol: string = await tokenContract.symbol();

  // For mint: notionalValue = USDC_amount * USDC_USD_price, expressed in D18.
  // Using the on-chain price accounts for any USDC depeg (e.g. 0.98$).
  // Ondo then computes the GM token quantity internally, guaranteeing price * quantity ≤ notionalValue.
  // For redeem: pass the GM token amount directly as tokenAmount.
  const attestationAmount = isMint
    ? {
        notionalValue: amount
          .times(await fetchUsdcPriceD18(pool))
          .div(1e24) // USDC has 6 decimals, price 18; /1e24 yields a plain decimal, then 18 dp
          .toFixed(18)
      }
    : { tokenAmount: amount.div(1e18).toFixed(18) };

  const attestation = await postOndoAttestation(
    symbol,
    isMint ? "buy" : "sell",
    attestationAmount,
    apiKey
  );

  const signature =
    "0x" + Buffer.from(attestation.signature, "base64").toString("hex");
  const quantity = new BigNumber(attestation.tokenAmount);
  const priceD18 = new BigNumber(attestation.price);

  let minAmountOut: BigNumber;
  if (isMint) {
    minAmountOut = quantity.times(10000 - slippageBps).div(10000);
  } else {
    // USDC out (6 dec) = quantity_D18 * price_D18 / 1e30
    const usdcOut = quantity.times(priceD18).div(1e30);
    minAmountOut = usdcOut.times(10000 - slippageBps).div(10000);
  }

  const quote = {
    chainId: 1,
    attestationId: attestation.attestationId,
    userId: toBytes32(attestation.userId),
    asset: attestation.assetAddress,
    price: priceD18.toFixed(0),
    quantity: quantity.toFixed(0),
    expiration: attestation.expiration,
    side: Number(attestation.side),
    // Contract requires additionalData == bytes32(0) (InvalidAdditionalData)
    additionalData: ethers.constants.HashZero
  };

  const swapTxData = iface.encodeFunctionData("swapExactInWithAttestation", [
    tokenIn,
    amount.toFixed(0),
    tokenOut,
    minAmountOut.toFixed(0),
    signature,
    quote
  ]);

  return { swapTxData, minAmountOut: minAmountOut.toFixed(0) };
}
