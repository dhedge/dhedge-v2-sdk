/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { chunk, flatten } from "lodash";
import merkleOrchardAbi from "../../abi/IBalancerMerkleOrchard.json";
import { ethers, Wallet } from "ethers";

import { getAddress } from "@ethersproject/address";

import { multicall } from "../../utils/contract";
import { bnum, loadTree, scale } from "../../utils";

import { ipfsService } from "./ipfs.service";

import {
  ClaimProofTuple,
  ClaimStatus,
  ComputeClaimProofPayload,
  MultiTokenPendingClaims,
  Report,
  Snapshot,
  TokenClaimInfo
} from "./types";

import { Network } from "../../types";
import { networkChainIdMap, stakingAddress } from "../../config";
import { soliditySha3 } from "web3-utils";
import { Dapp } from "../..";

export class ClaimService {
  network: Network;
  signer: ethers.Wallet;
  public constructor(network: Network, signer: Wallet) {
    this.network = network;
    this.signer = signer;
  }
  public async getMultiTokensPendingClaims(
    account: string
  ): Promise<MultiTokenPendingClaims[]> {
    const tokenClaimsInfo = await this.getTokenClaimsInfo();
    if (tokenClaimsInfo != null) {
      const multiTokenPendingClaims = await Promise.all(
        tokenClaimsInfo.map(tokenClaimInfo =>
          this.getTokenPendingClaims(tokenClaimInfo, getAddress(account))
        )
      );

      const multiTokenPendingClaimsWithRewards = multiTokenPendingClaims.filter(
        pendingClaim => Number(pendingClaim.availableToClaim) > 0
      );

      return multiTokenPendingClaimsWithRewards;
    }
    return [];
  }

  public async getTokenPendingClaims(
    tokenClaimInfo: TokenClaimInfo,
    account: string
  ): Promise<MultiTokenPendingClaims> {
    const snapshot = await this.getSnapshot(tokenClaimInfo.manifest);
    const weekStart = tokenClaimInfo.weekStart;
    const claimStatus = await this.getClaimStatus(
      Object.keys(snapshot).length,
      account,
      tokenClaimInfo
    );

    const pendingWeeks = claimStatus
      .map((status, i) => [i + weekStart, status])
      .filter(([, status]) => !status)
      .map(([i]) => i) as number[];

    const reports = await this.getReports(snapshot, pendingWeeks);

    const claims = Object.entries(reports)
      .filter((report: Report) => report[1][account])
      .map((report: Report) => {
        return {
          id: report[0],
          amount: report[1][account]
        };
      });

    //console.log("claims", claims);

    const availableToClaim = claims
      .map(claim => parseFloat(claim.amount))
      .reduce((total, amount) => total.plus(amount), bnum(0))
      .toString();

    return {
      claims,
      reports,
      tokenClaimInfo,
      availableToClaim
    };
  }

  public async multiTokenClaimRewards(
    account: string,
    multiTokenPendingClaims: MultiTokenPendingClaims[]
  ): Promise<any> {
    try {
      const multiTokenClaims = await Promise.all(
        multiTokenPendingClaims.map((tokenPendingClaims, tokenIndex) =>
          this.computeClaimProofs(
            tokenPendingClaims,
            getAddress(account),
            tokenIndex
          )
        )
      );

      return flatten(multiTokenClaims);
    } catch (e) {
      console.log("[Claim] Claim Rewards Error:", e);
      return Promise.reject(e);
    }
  }

  private async computeClaimProofs(
    tokenPendingClaims: MultiTokenPendingClaims,
    account: string,
    tokenIndex: number
  ): Promise<Promise<ClaimProofTuple[]>> {
    return Promise.all(
      tokenPendingClaims.claims.map(claim => {
        const payload: ComputeClaimProofPayload = {
          account,
          distributor: tokenPendingClaims.tokenClaimInfo.distributor,
          tokenIndex,
          decimals: tokenPendingClaims.tokenClaimInfo.decimals,
          // objects must be cloned
          report: { ...tokenPendingClaims.reports[claim.id] },
          claim: { ...claim }
        };

        return this.computeClaimProof(payload);
      })
    );
  }

  private computeClaimProof(
    payload: ComputeClaimProofPayload
  ): ClaimProofTuple {
    const {
      report,
      account,
      claim,
      distributor,
      tokenIndex,
      decimals
    } = payload;

    const claimAmount = claim.amount;
    const merkleTree = loadTree(report, decimals);

    const scaledBalance = scale(claimAmount, decimals).toString(10);

    const proof = merkleTree.getHexProof(
      soliditySha3(
        { t: "address", v: account },
        { t: "uint", v: scaledBalance }
      )
    );
    return [
      parseInt(claim.id),
      scaledBalance,
      distributor,
      tokenIndex,
      proof
    ] as ClaimProofTuple;
  }

  private async getTokenClaimsInfo() {
    let tokenClaims;
    try {
      const multiTokenClaim = await axios.get(
        "https://raw.githubusercontent.com/balancer-labs/frontend-v2/develop/src/services/claim/MultiTokenClaim.json"
      );
      const chainId = networkChainIdMap[this.network];
      tokenClaims = multiTokenClaim.data[chainId];
    } catch (e) {
      console.log("balancer multi token info error", e);
    }

    if (tokenClaims != null) {
      return (tokenClaims as TokenClaimInfo[]).map(tokenClaim => ({
        ...tokenClaim,
        token: getAddress(tokenClaim.token),
        decimals: 18
      }));
    }

    return null;
  }

  private async getSnapshot(manifest: string) {
    try {
      const response = await axios.get<Snapshot>(manifest);
      return response.data || {};
    } catch (error) {
      return {};
    }
  }

  private async getClaimStatus(
    totalWeeks: number,
    account: string,
    tokenClaimInfo: TokenClaimInfo
  ): Promise<ClaimStatus[]> {
    const { token, distributor, weekStart } = tokenClaimInfo;

    const claimStatusCalls = Array.from({ length: totalWeeks }).map((_, i) => [
      stakingAddress[this.network][Dapp.BALANCER],
      "isClaimed",
      [token, distributor, weekStart + i, account]
    ]);

    const rootCalls = Array.from({ length: totalWeeks }).map((_, i) => [
      stakingAddress[this.network][Dapp.BALANCER],
      "getDistributionRoot",
      [token, distributor, weekStart + i]
    ]);

    try {
      const result = (await multicall<boolean | string>(
        this.network,
        this.signer,
        merkleOrchardAbi.abi,
        [...claimStatusCalls, ...rootCalls],
        {},
        true
      )) as (boolean | string)[];

      if (result.length > 0) {
        const chunks = chunk(flatten(result), totalWeeks);

        const claimedResult = chunks[0] as boolean[];
        const distributionRootResult = chunks[1] as string[];

        return claimedResult.filter(
          (_, index) =>
            distributionRootResult[index] !== ethers.constants.HashZero
        );
      }
    } catch (e) {
      console.log("[Claim] Claim Status Error:", e);
    }

    return [];
  }

  private async getReports(snapshot: Snapshot, weeks: number[]) {
    const reports = await Promise.all<Report>(
      weeks
        .filter(week => snapshot[week] != null)
        .map(week => ipfsService.get(snapshot[week]))
    );
    return Object.fromEntries(reports.map((report, i) => [weeks[i], report]));
  }
}
