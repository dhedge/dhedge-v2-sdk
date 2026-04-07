import axios from "axios";
import { API_URL, dexIdNameMap } from "./constants";
import { perpDexIndex } from "./marketData";

export const getPositionSize = async (
  assetId: number,
  isSpot: boolean,
  assetName: string,
  user: string
): Promise<number> => {
  if (isSpot) {
    const response = await axios.post(API_URL, {
      type: "spotClearinghouseState",
      user
    });
    const balance = response.data.balances.find(
      (e: { coin: string }) => e.coin === assetName
    );
    if (!balance) throw new Error(`No balance found for asset ${assetName}`);
    return +balance.total;
  } else {
    const response = await axios.post(API_URL, {
      type: "clearinghouseState",
      user,
      dex: dexIdNameMap[perpDexIndex(assetId)]
    });
    const position = response.data.assetPositions.find(
      (e: { position: { coin: string } }) => e.position.coin === assetName
    );
    if (!position) throw new Error(`No position found for asset ${assetName}`);
    return +position.position.szi;
  }
};
