# Xuel RealEstate Tokenization Platform

## Overview

A sophisticated blockchain-based real estate tokenization platform built on Arbitrum that enables property owners to tokenize real estate assets, manage rentals, and create a liquid secondary market for property shares. The platform combines traditional real estate investment with DeFi mechanics to provide a seamless, transparent, and efficient property investment ecosystem.

Live at: https://realestate-tokenization.vercel.app/
video Demo :  https://www.loom.com/share/8d718af56bb9414ebd400f21844c24cd?sid=c44d37cc-0bb9-46ee-833f-54aaffa4d99a

## Core Features

### 1. Property Tokenization
- **Fractional Ownership**: Properties are divided into shares, enabling fractional investment
- **Flexible Configuration**: 
  - Customizable total shares and share prices
  - Configurable rent amounts and periods
  - Detailed property information including images, description, and location
- **Ownership Tracking**: Advanced tracking of share distribution and transfers

### 2. Rental Management
- **Smart Rent Collection**:
  - Automated rent period tracking
  - Late fee calculation (0.1% per day, max 30%)
  - Default status monitoring
- **Rent Distribution**:
  - Proportional distribution based on share ownership
  - Real-time rent accrual tracking
  - Automated unclaimed rent handling
- **Period Management**:
  - Configurable rental periods
  - Automatic period transitions
  - Default protection mechanisms

### 3. Secondary Market
- **Share Trading**:
  - List shares with custom pricing
  - Batch listing management
  - Price updates and cancellations
- **Market Features**:
  - Price range filtering
  - Active listing tracking
  - User portfolio management
- **Platform Security**:
  - 0.5% platform fee
  - Automated rent claims before transfers
  - Share ownership verification

### 4. Property Management
- **Owner Controls**:
  - Property details updates
  - Financial parameter management
  - Rent period configuration
- **Communication System**:
  - Property-specific messaging
  - Update and deletion capabilities
  - Timestamp tracking

### 5. Review System
- **Property Reviews**:
  - 1-5 star rating system
  - Written feedback
  - One review per address
- **Review Management**:
  - Review storage and retrieval
  - Review verification
  - Historical tracking

## Technical Details

### Smart Contract Architecture

1. **Data Structures**:
```solidity
struct Property {
    uint256 id;
    string name;
    address payable owner;
    uint256 price;
    uint256 totalShares;
    uint256 availableShares;
    uint256 rent;
    uint256 rentPool;
    // ... additional fields
}

struct ShareListing {
    uint256 propertyId;
    address seller;
    uint256 numberOfShares;
    uint256 pricePerShare;
    bool isActive;
    // ... additional fields
}
```

2. **Key Constants**:
```solidity
uint256 public constant PLATFORM_FEE = 50; // 0.5%
uint256 public constant LATE_FEE_RATE = 10; // 0.1% per day
uint256 public constant MAX_LATE_FEE = 3000; // 30%
```

### Security Features

1. **Access Control**:
- Owner-specific functions
- Share ownership verification
- Rental period restrictions

2. **Financial Safety**:
- Overflow protection
- Failed transfer handling
- Balance verification

3. **Error Handling**:
- Custom error messages
- State validation
- Transaction reversal protection

## Integration Guide

### Property Listing
```solidity
function listProperty(
    address payable _owner,
    string memory _name,
    uint256 _price,
    uint256 _totalShares,
    uint256 _rent,
    uint256 _rentPeriod,
    string memory _images,
    string memory _description,
    string memory _propertyAddress
) external
```

### Share Purchase
```solidity
function purchaseShares(
    uint256 _propertyId,
    uint256 _shares,
    address _buyer
) external payable
```

### Rent Payment
```solidity
function payRent(
    uint256 _propertyId,
    address _payer
) external payable
```

## Events and Monitoring

The contract emits detailed events for all major actions:
- Property listings and updates
- Share transfers and trades
- Rent payments and claims
- Default status changes
- Platform fee withdrawals

## Development Setup

1. **Prerequisites**:
- Solidity ^0.8.0
- Arbitrum Sepolia testnet
- Hardhat or Truffle

## Usage Guide


### Terms 
#### Period : A period is a the rent period that was set when listing the property.
         It can be active or inactive.
         If the period is active, that means rent has been paid for that period. 
         If the period is inactive, that means rent has not been paid for that period.
         After the period is over, the period becomes inactive until the rent is paid again.

#### Marketplace: This is a secondary market where shareholders can list thier shares for sale. 
         Shareholders can set the price and the number of shares they want to sell.
         The property owner can buy back shares from the marketplace.

#### Rent: This is what the shareholder will receive for the period.
            They can claim thier accrued rent whenever they want.
            It is advisable for the share holder to claim their rent before the period ends.
            At the ent of the rent period, the property owner can claim the rent of shares that where not sold.
            The rent you accrue depends on the percentage of shares you own and how long you hold them.
            If you sell your shares in the secondary market, you will not accrue any more rent for that period, the buyer will accrue the rent for the rest of the period.


### For Property Owners
1. Connect wallet and ensure sufficient ETH for gas
2. Create new property listing with required details
3. Set share distribution and rental terms
4. Monitor and manage property performance
5. You can also update the property details but you can only update the financial details if the period is inactive.
6. You can send a message that will be displayed to anyone viewing the property.

### For Investors
1. Browse available properties
2. Purchase shares directly or through marketplace
3. Collect rental income from owned shares
4. Trade shares on secondary market


## Smart Contract Addresses

- Main Contract: `0x039B0a4E5C69CD5C356c8d94d86C79BD208Ea3ad`
- Network: Arbitrum Sepolia


## Contributing
If you have suggestions for improvements or new features, please open an issue or submit a pull request.

