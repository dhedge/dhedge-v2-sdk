import axios from "axios";

export default class IpfsService {
  async get<T>(hash: string, protocol = "ipfs"): Promise<T> {
    const { data } = await axios.get(
      `https://cloudflare-ipfs.com/${protocol}/${hash}`
    );
    return data;
  }
}

export const ipfsService = new IpfsService();
