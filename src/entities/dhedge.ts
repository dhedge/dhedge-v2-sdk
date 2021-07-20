import { Contract, Wallet } from "ethers";

import PoolFactory from "../abi/PoolFactory.json";
import PoolLogic from "../abi/PoolLogic.json";
import ManagerLogic from "../abi/PoolManagerLogic.json";
import { factoryAddress } from "../config";
import { Network, SupportedAsset } from "../types";

import { Pool } from "./pool";
import { Utils } from "./utils";

export class Dhedge {
  public network: Network;
  public signer: Wallet;
  public factory: Contract;
  public utils: Utils;
  public constructor(wallet: Wallet, network: Network) {
    this.network = network;
    this.signer = wallet;
    this.factory = new Contract(
      factoryAddress[network],
      PoolFactory.abi,
      this.signer
    );

    this.utils = new Utils(this.network, this.signer);
  }

  /**
   * Creates a pool.
   *
   * @param {boolean} privatePool
   * @param {string} managerName
   * @param {string} poolName
   * @param {string} symbol
   * @param {tuple[]} supportedAssets
   * @param {number|BigNumber} managerFeeNumerator
   * @returns {Promise<Pool>}
   */
  public async createPool(
    managerName: string,
    poolName: string,
    symbol: string,
    supportedAssets: SupportedAsset[],
    managerFeeNumerator = 100
  ): Promise<Pool> {
    const pool = await this.factory.createFund(
      false,
      this.signer.getAddress(),
      managerName,
      poolName,
      symbol,
      managerFeeNumerator,
      supportedAssets
    );
    const receipt = await pool.wait(1);

    const creationEvent = receipt.events.find(
      (item: { event: string }) => item.event === "FundCreated"
    );
    if (!creationEvent) throw new Error("Fund not created");

    const poolAddress = creationEvent.args.fundAddress;
    const poolLogic = new Contract(poolAddress, PoolLogic.abi, this.signer);
    const managerLogicAddress = await poolLogic.poolManagerLogic();
    const managerLogic = new Contract(
      managerLogicAddress,
      ManagerLogic.abi,
      this.signer
    );

    return new Pool(
      this.network,
      this.signer,
      poolLogic,
      managerLogic,
      this.utils
    );
  }

  /**
   * Loads a pool based on the provided address
   * @param address pool address
   */
  public async loadPool(address: string): Promise<Pool> {
    const poolLogic = new Contract(address, PoolLogic.abi, this.signer);
    const managerLogicAddress = await poolLogic.poolManagerLogic();
    const managerLogic = new Contract(
      managerLogicAddress,
      ManagerLogic.abi,
      this.signer
    );

    return new Pool(
      this.network,
      this.signer,
      poolLogic,
      managerLogic,
      this.utils
    );
  }

  /**
   *  Checks if pool address is valid
   * @param {string} address pool address
   *
   */
  // private async validatePool(address: string): Promise<void> {
  //   console.log(address);
  //   const isPool = await this.factory.isPool(address);
  //   if (!isPool) throw new Error("Given address not a pool");
  // }
}
