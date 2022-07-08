import axios from "axios";

const excludedProtocols = ["OPTIMISM_PMM6"]; //Clipper

export async function getOneInchProtocols(chainId: number): Promise<string> {
  try {
    const response = (await axios.get(
      `https://api.1inch.io/v4.0/${chainId}/liquidity-sources`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    )) as any;
    const protocols = response.data.protocols.map((e: { id: string }) => e.id);
    const filteredProtocols = protocols.filter(
      (e: string) => !excludedProtocols.includes(e)
    );
    return `&protocols=${filteredProtocols.join(",")}`;
  } catch {
    return "";
  }
}
