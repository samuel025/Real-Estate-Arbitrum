# RealEstate DApp

## Overview

RealEstate DApp is a decentralized application built on Arbitrum Sepolia that revolutionizes real estate investment through tokenization. The platform enables property owners to tokenize their real estate assets and allows investors to purchase shares, earn rental income, and trade their holdings in a secure, transparent marketplace.

## Core Features

### Property Management
- **Property Tokenization**: Property owners can list their real estate by creating tokens that represent shares of ownership
- **Property Details**: Each listing includes comprehensive information:
  - Property name, description, and images
  - Total shares and price per share
  - Rental terms and periods
  - Physical property address
  - Current ownership distribution

### Investment Features
- **Share Purchase**: Users can buy shares of properties directly from owners
- **Secondary Market**: A marketplace for trading previously purchased shares
  - List shares for sale at custom prices
  - Buy shares from other investors
  - Cancel or modify share listings
- **Rental Income**: 
  - Automatic rent distribution based on share ownership
  - Claim accrued rental income
  - View detailed rent payment history

### Rental Management
- **Rent Collection**: 
  - Automated rent payment processing
  - Late fee calculation and distribution
  - Rent default tracking
- **Rent Periods**: 
  - Configurable rental periods
  - Real-time status tracking
  - Automatic period management

### User Features
- **Portfolio Management**:
  - View owned properties and shares
  - Track rental income and claims
  - Manage share listings
- **Property Reviews**: 
  - Submit and view property ratings
  - Leave detailed feedback
- **Wallet Integration**:
  - Connect with MetaMask
  - Automatic network switching to Arbitrum Sepolia
  - Real-time balance display

### Advanced Features
- **Smart Contract Security**:
  - Built-in checks for rent payments
  - Share ownership verification
  - Automated fee distribution
- **Market Analysis**:
  - View property performance metrics
  - Track rental yield
  - Monitor market activity

## Technical Architecture

### Smart Contract Layer
- Property tokenization logic
- Share transfer mechanisms
- Rent distribution system
- Market operations handling

### Frontend Integration
- React/Next.js based interface
- Thirdweb SDK integration
- Real-time blockchain updates
- Responsive design

### Key Components
- Property listing management
- Share trading system
- Rent payment processing
- User portfolio tracking

## Installation & Setup

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

## Usage Guide

### For Property Owners
1. Connect wallet and ensure sufficient ETH for gas
2. Create new property listing with required details
3. Set share distribution and rental terms
4. Monitor and manage property performance

### For Investors
1. Browse available properties
2. Purchase shares directly or through marketplace
3. Collect rental income from owned shares
4. Trade shares on secondary market

### For Renters
1. View property details and rental terms
2. Process rent payments
3. Submit property reviews
4. Track payment history

## Smart Contract Addresses

- Main Contract: `0x3e488Bb2eE72A6E89f6D9fe526dF77Ea8E751aad`
- Network: Arbitrum Sepolia

## Security Features

- Automated rent distribution
- Share ownership verification
- Late payment handling
- Default protection mechanisms

## Future Enhancements

- Multi-token support
- Advanced analytics dashboard
- Mobile application
- Cross-chain integration

## Contributing

Contributions are welcome! If you have suggestions for improvements or new features, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Thirdweb](https://thirdweb.com/) for providing the tools to build on the blockchain.
- [React](https://reactjs.org/) for the frontend framework.
- [Next.js](https://nextjs.org/) for server-side rendering and routing.
