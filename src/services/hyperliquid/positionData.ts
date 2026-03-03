import axios from "axios";
import { API_URL } from "./constants";

export const getPositionSize = async (
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
      user
    });
    console.log("position size response :", response.data);
    const position = response.data.assetPositions.find(
      (e: { position: { coin: string } }) => e.position.coin === assetName
    );
    console.log("position size found :", position);
    if (!position) throw new Error(`No position found for asset ${assetName}`);
    return +position.position.szi;
  }
};
