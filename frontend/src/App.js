import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState('0');
  const [depositAmount, setDepositAmount] = useState('');

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        setAccount(accounts[0]);
      } catch (error) {
        console.error('Wallet connection error:', error);
      }
    } else {
      alert('Please install MetaMask!');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🏦 DeFi Deposit Platform</h1>
        <p>Stablecoin deposits with dynamic interest rates</p>
      </header>

      <main className="App-main">
        {!account ? (
          <div className="connect-section">
            <button className="connect-button" onClick={connectWallet}>
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="dashboard">
            <div className="account-info">
              <p>Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <h3>Your Deposit</h3>
                <p className="stat-value">{balance} USDT</p>
              </div>
              <div className="stat-card">
                <h3>Accumulated Interest</h3>
                <p className="stat-value">0.00 USDT</p>
              </div>
              <div className="stat-card">
                <h3>Current Rate</h3>
                <p className="stat-value">5.00% APY</p>
              </div>
            </div>

            <div className="action-section">
              <div className="action-card">
                <h2>Make Deposit</h2>
                <input
                  type="number"
                  placeholder="Amount in USDT"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="input-field"
                />
                <button className="action-button">
                  Deposit
                </button>
              </div>

              <div className="action-card">
                <h2>Withdraw Funds</h2>
                <button className="action-button secondary">
                  Withdraw All
                </button>
                <button className="action-button secondary">
                  Claim Interest
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="App-footer">
        <p>Powered by Ethereum • Chainlink • React</p>
      </footer>
    </div>
  );
}

export default App;
