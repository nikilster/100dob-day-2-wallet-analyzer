'use client';

import React, { useState } from 'react';

export function SimpleConnect() {
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectMetaMask = async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('Please install MetaMask!');
      return;
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      setAccount(accounts[0]);
      setError(null);

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        setAccount(accounts[0] || null);
      });
    } catch (err) {
      setError('Failed to connect to MetaMask');
      console.error(err);
    }
  };

  return (
    <div className="p-4">
      {error && (
        <div className="text-red-500 mb-4">{error}</div>
      )}
      
      {!account ? (
        <button
          onClick={connectMetaMask}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Connect MetaMask
        </button>
      ) : (
        <div>
          <p>Connected Account:</p>
          <p className="font-mono">{account}</p>
        </div>
      )}
    </div>
  );
} 