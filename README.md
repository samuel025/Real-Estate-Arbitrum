# RealEstate DApp

## Overview

RealEstate DApp is a decentralized application built using React and Thirdweb that allows users to list, buy, and sell properties on the blockchain. The application features a wallet connection, user balance display, and a profile menu for managing user properties and investments.

## Features

- Connect and disconnect wallet using MetaMask.
- List properties for sale or rent.
- View user balance and address.
- Manage user properties and investments.
- Switch to Arbitrum Sepolia network when connecting the wallet.

## Technologies Used

- **Frontend:** React, Next.js
- **Blockchain:** Ethereum, Arbitrum Sepolia
- **Smart Contracts:** Thirdweb
- **Styling:** CSS Modules
- **Icons:** React Icons

## Project Structure
frontend
├── /components
│ ├── Navbar.js # Navbar component for wallet connection and navigation
│ └── ... # Other components
├── /context
│ ├── index.js # Context for managing application state and blockchain interactions
├── /styles
│ ├── Navbar.module.css # CSS module for Navbar styling
└── ... # Other files and folders



## Installation

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- MetaMask wallet

### Getting Started

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/RealEstate-DApp.git
   cd RealEstate-DApp
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables:**

   Create a `.env.local` file in the root of the `frontend` directory and add your environment variables (if any).

4. **Run the application:**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

   The application will be available at `http://localhost:3000`.

## Usage

1. Open the application in your browser.
2. Click on the "Connect Wallet" button in the Navbar to connect your MetaMask wallet.
3. If your wallet is on a different network, it will automatically switch to Arbitrum Sepolia.
4. Use the navigation links to list properties, view your properties, and manage your investments.

## Contributing

Contributions are welcome! If you have suggestions for improvements or new features, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Thirdweb](https://thirdweb.com/) for providing the tools to build on the blockchain.
- [React](https://reactjs.org/) for the frontend framework.
- [Next.js](https://nextjs.org/) for server-side rendering and routing.
