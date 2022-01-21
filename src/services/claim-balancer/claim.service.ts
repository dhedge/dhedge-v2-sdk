/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { chunk, flatten, groupBy } from "lodash";
import merkleOrchardAbi from "../../abi/IBalancerMerkleOrchard.json";
import { ethers, Wallet } from "ethers";

import { getAddress } from "@ethersproject/address";

import { multicall } from "../../utils/contract";
import { bnum, loadTree, scale } from "../../utils";

import { ipfsService } from "./ipfs.service";

import MultiTokenClaim from "./MultiTokenClaim.json";

import {
  ClaimProofTuple,
  ClaimStatus,
  ComputeClaimProofPayload,
  MultiTokenCurrentRewardsEstimate,
  MultiTokenCurrentRewardsEstimateResponse,
  MultiTokenPendingClaims,
  Report,
  Snapshot,
  TokenClaimInfo
} from "./types";

import { Network } from "../../types";
import { stakingAddress } from "../../config";
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
    const tokenClaimsInfo = this.getTokenClaimsInfo();
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

  public async getMultiTokensCurrentRewardsEstimate(
    account: string
  ): Promise<{
    data: MultiTokenCurrentRewardsEstimate[];
    timestamp: string | null;
  }> {
    try {
      const response = await axios.get<
        MultiTokenCurrentRewardsEstimateResponse
      >(
        `https://api.balancer.finance/liquidity-mining/v1/liquidity-provider-multitoken/${account}`
      );
      if (response.data.success) {
        const multiTokenLiquidityProviders = response.data.result[
          "liquidity-providers"
        ]
          .filter(incentive => incentive.chain_id === 137)
          .map(incentive => ({
            ...incentive,
            token_address: getAddress(incentive.token_address)
          }));

        const multiTokenCurrentRewardsEstimate: MultiTokenCurrentRewardsEstimate[] = [];

        const multiTokenLiquidityProvidersByToken = Object.entries(
          groupBy(multiTokenLiquidityProviders, "token_address")
        );

        for (const [
          token,
          liquidityProvider
        ] of multiTokenLiquidityProvidersByToken) {
          const rewards = liquidityProvider
            .reduce(
              (total, { current_estimate }) => total.plus(current_estimate),
              bnum(0)
            )
            .toString();

          const velocity =
            liquidityProvider
              .find(liquidityProvider => Number(liquidityProvider.velocity) > 0)
              ?.velocity.toString() ?? "0";

          if (Number(rewards) > 0) {
            multiTokenCurrentRewardsEstimate.push({
              rewards,
              velocity,
              token: getAddress(token)
            });
          }
        }

        return {
          data: multiTokenCurrentRewardsEstimate,
          timestamp: response.data.result.current_timestamp
        };
      }
    } catch (e) {
      console.log("[Claim] Current Rewards Estimate Error", e);
    }
    return {
      data: [],
      timestamp: null
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

  private getTokenClaimsInfo() {
    const tokenClaims = MultiTokenClaim["137"];

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
