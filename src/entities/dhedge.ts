/* eslint-disable @typescript-eslint/no-explicit-any */
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
   * Create a new pool.
   *
   * @param {string} managerName Name of manager
   * @param {string} poolName Pool name
   * @param {string} symbol Token symbol
   * @param {tuple[]} supportedAssets Enabled assets to trade
   * @param {number|BigNumber} managerFeeNumerator Manger fee in percent
   * @param {any} options Transaction options
   * @returns {Pool} Created Pool
   */
  public async createPool(
    managerName: string,
    poolName: string,
    symbol: string,
    supportedAssets: SupportedAsset[],
    managerFeeNumerator = 20,
    options: any = null
  ): Promise<Pool> {
    const pool = await this.factory.createFund(
      false,
      this.signer.getAddress(),
      managerName,
      poolName,
      symbol,
      managerFeeNumerator * 100,
      supportedAssets,
      options
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
      this.utils,
      this.factory
    );
  }

  /**
   * Load a pool based on the provided address
   * @param {string} address Pool address
   * @returns {Pool} Loaded Pool
   */
  public async loadPool(address: string, isDhedge = true): Promise<Pool> {
    const poolLogic = new Contract(address, PoolLogic.abi, this.signer);
    let managerLogicAddress = address;
    if (isDhedge) managerLogicAddress = await poolLogic.poolManagerLogic();
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
      this.utils,
      this.factory,
      isDhedge
    );
  }

  /**
   * Check if pool address is valid
   * @param {string} address Pool address
   * @returns {boolean} Is valid pool address
   */
  validatePool(address: string): Promise<boolean> {
    return this.factory.isPool(address);
  }
}
