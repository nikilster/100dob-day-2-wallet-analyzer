'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { analyzeWallet, WalletStats } from '../services/blockchain';

// Personality types based on crypto experience
const personalityTypes = [
  { level: 0, title: "Amish", image: "🚫", description: "What&apos;s a computer?" },
  { level: 1, title: "Peter Schiff", image: "🪙", description: "Still thinks crypto is a Ponzi scheme" },
  { level: 2, title: "Elizabeth Warren", image: "👩‍⚖️", description: "Thinks crypto is only for criminals" },
  { level: 3, title: "Jim Cramer", image: "📺", description: "Finally excited about crypto" },
  { level: 4, title: "Mark Cuban", image: "🦈", description: "Got rugged but still believes" },
  { level: 5, title: "Gary Gensler", image: "👨‍🏫", description: "Taught crypto at MIT, now regulates it" },
  { level: 6, title: "Sam Bankman-Fried", image: "👨‍🦱", description: "Started off solid" },
  { level: 7, title: "CZ Binance", image: "🔄", description: "Funds are SAFU" },
  { level: 8, title: "Do Kwon", image: "🌕", description: "Up and to the right!?!" },
  { level: 9, title: "Vitalik Buterin", image: "👨‍💻", description: "Created Ethereum in his sleep" },
  { level: 10, title: "Satoshi Nakamoto", image: "👻", description: "The one who started it all" },
];

export default function Home() {
  const { address, isConnected } = useAccount();
  const [walletStats, setWalletStats] = useState<WalletStats>({
    transactions: 0,
    contracts: 0,
    tokens: 0,
    nfts: 0,
    complexity: 0,
    experience: 'New',
    recentActivity: 'N/A',
  });
  const [personality, setPersonality] = useState(personalityTypes[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Handle mounting state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update personality when wallet stats change
  useEffect(() => {
    const score = Math.min(Math.floor(walletStats.complexity), 10);
    setPersonality(personalityTypes[score]);
  }, [walletStats.complexity]);

  const fetchWalletStats = useCallback(async () => {
    if (!address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const stats = await analyzeWallet(address);
      setWalletStats(stats);
    } catch (err) {
      setError('Failed to analyze wallet. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) {
      fetchWalletStats();
    }
  }, [address, isConnected, fetchWalletStats]);

  // Return null on server-side or before mounting
  if (!mounted) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Nikil&apos;s Wallet Ranking Analyzer</h1>
        <p className="text-xl text-gray-600">See how degen you are 😎</p>
      </div>

      <div className="flex justify-center mb-8">
        <ConnectButton />
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isConnected && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Analyzing your wallet...</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-semibold mb-4">Your Wallet Stats</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-600">Transactions</h3>
                  <p className="text-2xl font-bold">{walletStats.transactions}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-600">Smart Contract Interactions</h3>
                  <p className="text-2xl font-bold">{walletStats.contracts}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-600">Unique Tokens</h3>
                  <p className="text-2xl font-bold">{walletStats.tokens}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-600">NFTs</h3>
                  <p className="text-2xl font-bold">{walletStats.nfts}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-600">Experience</h3>
                  <p className="text-2xl font-bold">{walletStats.experience}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-600">Last Active</h3>
                  <p className="text-2xl font-bold">{walletStats.recentActivity}</p>
                </div>
              </div>

              <h2 className="text-2xl font-semibold mb-4">You Are</h2>
              
              <div className="text-center p-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
                <div className="text-6xl mb-4">{personality.image}</div>
                <h3 className="text-2xl font-bold mb-2">
                  {personality.title}
                </h3>
                <p className="text-gray-600 mb-4">{personality.description}</p>
                <div className="inline-block bg-white px-4 py-2 rounded-full">
                  <span className="font-medium text-gray-600">Degen Score: </span>
                  <span className="text-xl font-bold">{walletStats.complexity}/10</span>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* ... existing stats cards ... */}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
} 