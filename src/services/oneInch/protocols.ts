import axios from "axios";

export async function getOneInchProtocols(chainId: number): Promise<string> {
  try {
    const response = await axios.get(
      `https://api.1inch.io/v5.0/${chainId}/liquidity-sources`
    );
    const protocols = response.data.protocols.map((e: { id: string }) => e.id);
    const filteredProtocols = protocols.filter(
      (e: string) => !e.includes("PMM")
    );

    return `&protocols=${filteredProtocols.join(",")}`;
  } catch {
    return "";
  }
}
