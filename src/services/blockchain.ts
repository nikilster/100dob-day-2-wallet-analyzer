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

    // Get transaction count (nonce)
    const nonce = await client.getTransactionCount({ address });

    // Get unique contract interactions
    const transfers = await alchemy.core.getAssetTransfers({
      fromAddress: address,
      category: [AssetTransfersCategory.EXTERNAL],
      withMetadata: true,
      maxCount: 100,
    });

    // Count unique contract addresses
    const uniqueContracts = new Set(
      transfers.transfers
        .filter(t => t.to !== null)
        .map(t => t.to.toLowerCase())
    ).size;

    // Calculate complexity score based on various factors
    const baseScore = (
      Number(nonce) / 50 + // Transaction weight (1 point per 50 transactions)
      uniqueContracts / 5 + // Contract interaction weight (1 point per 5 contracts)
      totalTokens / 4 + // Token holdings weight (1 point per 4 tokens)
      nfts / 5 // NFT holdings weight (1 point per 5 NFTs)
    );

    // Apply exponential difficulty curve
    const complexityScore = Math.min(
      Math.floor(
        Math.pow(baseScore, 0.7) // Apply power curve to make higher levels harder
      ),
      10
    );

    // Ensure at least 1 if there's any activity
    const finalScore = Number(nonce) > 0 || uniqueContracts > 0 || totalTokens > 0 || nfts > 0 
      ? Math.max(complexityScore, 1) 
      : 0;

    return {
      transactions: Number(nonce),
      contracts: uniqueContracts,
      tokens: totalTokens,
      nfts,
      complexity: finalScore,
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