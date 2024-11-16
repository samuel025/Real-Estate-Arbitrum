"use client";

import "./globals.css";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { AppProvider } from '../context';
import { metamaskWallet } from "@thirdweb-dev/react";

const activeChain = {
  chainId: 421614,
  rpc: ["https://sepolia-rollup.arbitrum.io/rpc"],
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
  shortName: "arb-sepolia",
  slug: "arbitrum-sepolia",
  testnet: true,
  chain: "Arbitrum Sepolia",
  name: "Arbitrum Sepolia",
  blockExplorers: [{
    name: "Arbiscan",
    url: "https://sepolia.arbiscan.io"
  }],
  icon: {
    url: "https://arbitrum.foundation/favicon.ico",
    width: 96,
    height: 96,
    format: "ico"
  }
};

export default function RootLayout({ children }) {
  const clientId = "1816f41bc9201efeaa93a8d04d64af19";
  
  return (
    <html lang="en">
      <body>
        <ThirdwebProvider 
          activeChain={activeChain}
          clientId={clientId}
          supportedWallets={[metamaskWallet()]}
          dAppMeta={{
            name: "RealEstate",
            description: "Real Estate DApp",
            logoUrl: "https://your-logo-url.com",
            url: "https://your-website.com",
            isDarkMode: false
          }}
        >
          <AppProvider>
            {children}
          </AppProvider>
        </ThirdwebProvider>
      </body>
    </html>
  );
}
