export const USDC_TOKEN_ID = 0;
export const USDC_CORE_ADDRESS = "0x2000000000000000000000000000000000000000";
export const CORE_WRITER_ADDRESS = "0x3333333333333333333333333333333333333333";
export const PERP_DEX_ID = 0;
export const SPOT_DEX_ID = 4294967295; // max uint32;
export const HYPERLIQUID_VERSION = 1;

//Action IDs
export const SPOT_SEND_ACTION = 6;
export const SEND_ASSET_ACTION = 13;
export const LIMIT_ORDER_ACTION = 1;

//Order Time In Force options
export const LIMIT_ORDER_TIF_ALO = 1;
export const LIMIT_ORDER_TIF_GTC = 2;
export const LIMIT_ORDER_TIF_IOC = 3;

export const assetConfig: {
  [key: number]: { symbol: string; szDecimals: number };
} = {
  0: { symbol: "BTC", szDecimals: 5 }
};

export const dexIdNameMap: { [key: number]: string } = {
  0: "",
  1: "xyz"
};

export const API_URL = "https://api.hyperliquid.xyz/info";
