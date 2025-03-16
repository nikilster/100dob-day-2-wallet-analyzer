import { Alchemy, Network, AssetTransfersCategory } from 'alchemy-sdk';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

// Initialize Alchemy SDK
const alchemy = new Alchemy({
  apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
});

// Initialize viem client for basic calls
const client = createPublicClient({
  chain: mainnet,
  transport: http(),
});

export interface WalletStats {
  transactions: number;
  contracts: number;
  tokens: number;
  nfts: number;
  complexity: number;
  experience: string; // Time since first transaction
  recentActivity: string; // Time since most recent transaction
}

export async function analyzeWallet(address: string): Promise<WalletStats> {
  try {
    // Get all token balances including ERC20s
    const tokenBalances = await alchemy.core.getTokenBalances(address);
    const tokens = tokenBalances.tokenBalances.filter(token => 
      token.tokenBalance !== null && 
      token.tokenBalance !== '0' && 
      BigInt(token.tokenBalance) > BigInt(0)
    ).length;

    // Add ETH balance check
    const ethBalance = await client.getBalance({ address: address as `0x${string}` });
    const hasEth = ethBalance > BigInt(0);
    const totalTokens = tokens + (hasEth ? 1 : 0); // Count ETH as a token if balance > 0

    // Get NFT count
    const nftData = await alchemy.nft.getNftsForOwner(address);
    const nfts = nftData.totalCount;

    // Get transaction count (nonce) - this only counts external transactions
    const nonce = await client.getTransactionCount({ address: address as `0x${string}` });

    // Get historical transactions (for total count and first transaction)
    let allTransfers: Awaited<ReturnType<typeof alchemy.core.getAssetTransfers>>['transfers'] = [];
    let pageKey: string | undefined = undefined;
    let pageCount = 0;
    
    do {
      pageCount++;
      const historicalTransfersPage = await alchemy.core.getAssetTransfers({
        fromAddress: address,
        category: [AssetTransfersCategory.EXTERNAL],
        withMetadata: true,
        maxCount: 1000,
        pageKey,
        fromBlock: "0x0",
      });
      
      allTransfers = [...allTransfers, ...historicalTransfersPage.transfers];
      pageKey = historicalTransfersPage.pageKey;
      
    } while (pageKey && pageCount < 10); // Limit to 10 pages (10,000 transfers) for safety

    // Use nonce for total transactions (only external)
    const totalTransactions = Number(nonce);

    // Count unique contract addresses (only from external transactions)
    const uniqueContracts = new Set(
      allTransfers
        .filter(t => t.to !== null && t.to !== address.toLowerCase()) // Don't count self-transfers
        .map(t => t.to!.toLowerCase())
    ).size;

    let recentActivity = 'No activity';
    if (allTransfers.length > 0) {
      // Sort transfers by timestamp to get the most recent
      const sortedTransfers = allTransfers
        .filter(t => t.metadata?.blockTimestamp)
        .sort((a, b) => {
          const dateA = new Date(a.metadata!.blockTimestamp);
          const dateB = new Date(b.metadata!.blockTimestamp);
          return dateB.getTime() - dateA.getTime();
        });

      if (sortedTransfers.length > 0) {
        const lastTxTime = sortedTransfers[0].metadata!.blockTimestamp;
        const now = new Date();
        const lastTxDate = new Date(lastTxTime);
        const diffInSeconds = Math.floor((now.getTime() - lastTxDate.getTime()) / 1000);
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);
        const diffInMonths = Math.floor(diffInDays / 30);
        const diffInYears = Math.floor(diffInDays / 365);

        if (diffInSeconds < 60) {
          recentActivity = `${diffInSeconds} ${diffInSeconds === 1 ? 'second' : 'seconds'}`;
        } else if (diffInMinutes < 60) {
          recentActivity = `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'}`;
        } else if (diffInHours < 24) {
          recentActivity = `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'}`;
        } else if (diffInDays < 30) {
          recentActivity = `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'}`;
        } else if (diffInMonths < 12) {
          recentActivity = `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'}`;
        } else {
          recentActivity = `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'}`;
        }
      }
    }

    // Calculate experience using the oldest transaction
    let experience = 'New';
    if (allTransfers.length > 0) {
      // Sort transfers by timestamp to get the oldest
      const sortedTransfers = [...allTransfers].sort((a, b) => {
        const dateA = new Date(a.metadata!.blockTimestamp);
        const dateB = new Date(b.metadata!.blockTimestamp);
        return dateA.getTime() - dateB.getTime();
      });

      const firstTxTime = sortedTransfers[0].metadata!.blockTimestamp;
      const now = new Date();
      const firstTxDate = new Date(firstTxTime);
      const diffInSeconds = Math.floor((now.getTime() - firstTxDate.getTime()) / 1000);
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      const diffInHours = Math.floor(diffInMinutes / 60);
      const diffInDays = Math.floor(diffInHours / 24);
      const diffInMonths = Math.floor(diffInDays / 30);
      const diffInYears = Math.floor(diffInDays / 365);
      
      // Add experience points to base score (1 point per 6 months, max 5 points)
      const experiencePoints = Math.min(diffInMonths / 6, 5);

      if (diffInSeconds < 60) {
        experience = `${diffInSeconds} ${diffInSeconds === 1 ? 'second' : 'seconds'}`;
      } else if (diffInMinutes < 60) {
        experience = `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'}`;
      } else if (diffInHours < 24) {
        experience = `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'}`;
      } else if (diffInDays < 30) {
        experience = `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'}`;
      } else if (diffInMonths < 12) {
        experience = `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'}`;
      } else {
        experience = `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'}`;
      }

      // Calculate complexity score based on various factors
      const baseScore = (
        totalTransactions / 75 + // Transaction weight (1 point per 75 transactions)
        uniqueContracts / 8 + // Contract interaction weight (1 point per 8 contracts)
        totalTokens / 12 + // Token holdings weight (1 point per 12 tokens)
        nfts / 15 + // NFT holdings weight (1 point per 15 NFTs)
        experiencePoints // Experience weight (1 point per 6 months, max 5)
      );

      // Apply exponential difficulty curve
      const complexityScore = Math.min(
        Math.floor(
          Math.pow(baseScore, 0.7) // Slightly less steep power curve
        ),
        10
      );

      // Ensure at least 1 if there's any activity
      const finalScore = Number(nonce) > 0 || uniqueContracts > 0 || totalTokens > 0 || nfts > 0 
        ? Math.max(complexityScore, 1) 
        : 0;

      return {
        transactions: totalTransactions,
        contracts: uniqueContracts,
        tokens: totalTokens,
        nfts,
        complexity: finalScore,
        experience,
        recentActivity,
      };
    }

    return {
      transactions: totalTransactions,
      contracts: uniqueContracts,
      tokens: totalTokens,
      nfts,
      complexity: 0,
      experience: 'New',
      recentActivity: 'No activity',
    };
  } catch (error) {
    console.error('Error analyzing wallet:', error);
    throw error;
  }
}

// Additional helper functions
export async function getTokenBalances(address: string) {
  return alchemy.core.getTokenBalances(address);
}

export async function getNFTsForOwner(address: string) {
  return alchemy.nft.getNftsForOwner(address);
}

export async function getTransactionHistory(address: string) {
  return alchemy.core.getAssetTransfers({
    fromAddress: address,
    category: [AssetTransfersCategory.EXTERNAL],
    withMetadata: true,
    maxCount: 100,
  });
} 