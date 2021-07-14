import { Contract, Wallet, ethers } from "ethers";

import PoolFactory from "../abi/PoolFactory.json";
import PoolLogic from "../abi/PoolLogic.json";
import ManagerLogic from "../abi/PoolManagerLogic.json";
import { walletConfig, factoryAddress } from "../config";

import { Pool } from "./pool";

const usdc = "0x9D4Dc547d9c1822aEd5b6e19025894d1B7A54036";

export class Dhedge {
  public signer: Wallet;
  public factory: Contract;
  public constructor() {
    const provider = new ethers.providers.JsonRpcProvider(
      walletConfig.provider
    );

    this.signer = walletConfig.privateKey
      ? new Wallet(walletConfig.privateKey, provider)
      : Wallet.fromMnemonic(
          walletConfig.mnemonic,
          "m/44'/60'/0'/0/" + walletConfig.accountId
        ).connect(provider);

    this.factory = new Contract(
      factoryAddress[walletConfig.network],
      PoolFactory.abi,
      this.signer
    );
  }

  /**
   * Creates a pool.
   *
   * @param {boolean} privatePool
   * @param {string} managerName
   * @param {string} poolName
   * @param {tuple[]} supportedAssets //not sure if correct.. maybe {string[]} supportedAssets
   * @param {number|BigNumber} managerFeeNumerator
   * @returns {Promise<Pool>}
   */
  public async createPool(
    privatePool: false,
    managerName: "Batman",
    poolName: "Gotham Pool",
    symbol = "DHPT",
    supportedAssets = [[usdc, true]], // [{ address: usdc, isDeposited: false }],
    managerFeeNumerator = 100
  ): Promise<Pool> {
    const pool = await this.factory.createFund(
      privatePool,
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

    return new Pool(this.signer, poolLogic, managerLogic);
  }

  /**
   * Loads a pool based on the provided address
   * @param address pool address
   */
  public async loadPool(address: string): Promise<Pool> {
    //await this.validatePool(address);
    const poolLogic = new Contract(address, PoolLogic.abi, this.signer);
    const managerLogicAddress = await poolLogic.poolManagerLogic();
    const managerLogic = new Contract(
      managerLogicAddress,
      ManagerLogic.abi,
      this.signer
    );

    return new Pool(this.signer, poolLogic, managerLogic);
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
