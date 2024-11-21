import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

import { 
    useAddress,
    useContract,
    useContractWrite,
    useMetamask,
    useSigner,
    useDisconnect,
    useContractRead,
} from "@thirdweb-dev/react";

import { ethers } from "ethers";

// Add these constants to match the contract
const PLATFORM_FEE = 50; // 0.5%
const BASIS_POINTS = 10000;

const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};



export const AppProvider = ({children}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  const {contract} = useContract("0x039B0a4E5C69CD5C356c8d94d86C79BD208Ea3ad")
  const {mutateAsync: listSharesForSale} = useContractWrite(contract, "listSharesForSale")
  const { mutateAsync: buyShares } = useContractWrite(contract, "purchaseShares");

  const address = useAddress();
  const connectWithMetamask = useMetamask()
  const disconnect = useDisconnect();
  const signer = useSigner();

  useEffect(() => {
    const ethereum = getEthereum();
    if (ethereum) {
      ethereum.on('accountsChanged', handleAccountsChanged);
      ethereum.on('chainChanged', handleChainChanged);

      const checkConnection = async () => {
        try {
          const accounts = await ethereum.request({
            method: 'eth_accounts'
          });
          
          if (accounts.length > 0) {
            const chainId = await ethereum.request({ 
              method: 'eth_chainId' 
            });

            if (chainId !== '0x66eee') {
              await ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x66eee' }],
              });
            }
            
            await connectWithMetamask();
          }
        } catch (error) {
          console.error('Error checking connection:', error);
        }
      };

      checkConnection();
    }

    return () => {
      if (ethereum) {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
        ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []); 

  const handleAccountsChanged = async (accounts) => {
    if (accounts.length === 0) {
      disconnect();
    } else {
      const ethereum = getEthereum();
      if (ethereum) {
        const chainId = await ethereum.request({ 
          method: 'eth_chainId' 
        });
        
        if (chainId !== '0x66eee') {
          await connect(); 
        }
      }
    }
  };

  const handleChainChanged = async (_chainId) => {
    if (_chainId !== '0x66eee') {
      await connect(); 
    }
    window.location.reload();
  };

  const getEthereum = () => {
    if (typeof window !== 'undefined') {
      const isHttps = window.location.protocol === 'https:';
      
      if (window.ethereum?.providers) {
        const metaMaskProvider = window.ethereum.providers.find(provider => provider.isMetaMask);
        if (metaMaskProvider) {
          if (isHttps) {
            metaMaskProvider.enable = metaMaskProvider.request.bind(metaMaskProvider, {
              method: 'eth_requestAccounts'
            });
          }
          return metaMaskProvider;
        }
        return window.ethereum.providers[0];
      }
      
      if (window.ethereum) {
        if (isHttps) {
          window.ethereum.enable = window.ethereum.request.bind(window.ethereum, {
            method: 'eth_requestAccounts'
          });
        }
        return window.ethereum;
      }
      
      return null;
    }
    return null;
  };

  const connect = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      const ethereum = getEthereum();
      
      if (!ethereum) {
        setConnectionError('Please install a Web3 wallet');
        alert("Please install MetaMask or another Web3 wallet to use this application");
        window.open("https://metamask.io/download/", "_blank");
        return;
      }

      try {
        if (ethereum.isMetaMask) {
          try {
            await ethereum.request({ method: 'eth_requestAccounts' });
          } catch (requestError) {
            if (ethereum.enable) {
              await ethereum.enable();
            } else {
              throw requestError;
            }
          }
          await connectWithMetamask();
        } else {
          await ethereum.request({ method: 'eth_requestAccounts' });
          await connectWithMetamask();
        }

        const chainId = await ethereum.request({ 
          method: 'eth_chainId' 
        });

        if (chainId !== '0x66eee') {
          try {
            await ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x66eee' }],
            });
          } catch (switchError) {
            if (switchError.code === 4902) {
              await ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0x66eee',
                  chainName: 'Arbitrum Sepolia',
                  nativeCurrency: {
                    name: 'ETH',
                    symbol: 'ETH',
                    decimals: 18
                  },
                  rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
                  blockExplorerUrls: ['https://sepolia.arbiscan.io']
                }],
              });
            } else {
              throw switchError;
            }
          }
        }

        const accounts = await ethereum.request({
          method: 'eth_accounts'
        });
        
        if (accounts.length > 0) {
          return true;
        }

      } catch (error) {
        console.error("Connection error:", error);
        setConnectionError(error.message || "Failed to connect");
        throw error;
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const [userBalance, setUserBalance] = useState("");
  useEffect(() => {
    const fetchBalance = async () => {
      if (signer) {
        try {
          const balance = await signer.getBalance();
          const formattedBalance = Number(ethers.utils.formatEther(balance)).toFixed(3);
          setUserBalance(formattedBalance);
        } catch (error) {
          console.error("Error fetching balance:", error);
          setUserBalance("0");
        }
      } else {
        setUserBalance("0");
      }
    };

    fetchBalance();
  }, [signer]);


  // -------------------------------------

  const listPropertyFunction = async (
    owner,
    name,
    price,
    totalShares,
    rent,
    rentPeriod,
    images,
    description,
    propertyAddress
  ) => {
    try {
        const data = await contract.call(
            "listProperty",
            [
                owner,          
                name,           
                price,          
                totalShares,   
                rent,
                rentPeriod,
                images,
                description,   
                propertyAddress 
            ]
        );
        return data;
    } catch (error) {
        console.error("Error in listPropertyFunction:", error);
        throw error;
    }
  }

  // -------------------------------------

  const { data: properties } = useContractRead(contract, "getAllProperties");

  const getPropertiesFunction = useCallback(async () => {
    try {
      if (!properties || properties.length === 0) {
        return [];
      }

      const parsedProperties = properties.map((property) => ({
        propertyId: property.id.toString(),
        owner: property.owner,
        title: property.name,
        description: property.description,
        price: property.price.toString(),
        rent: property.rent.toString(),
        rentPeriod: property.rentPeriod.toString(),
        image: property.images,
        propertyAddress: property.propertyAddress,
        totalShares: property.totalShares?.toString(),
        availableShares: property.availableShares?.toString()
      }));

      return parsedProperties;
    } catch (error) {
      console.error("Error in getPropertiesFunction:", error);
      return [];
    }
  }, [properties]);

  // -------------------------------------

  const {mutateAsync: updateProperty} = useContractWrite(contract, "updateProperty");
  const updatePropertyFunction = async (form) => {
      const {propertyId, name, price, rent, rentPeriod, images, description, propertyAddress} = form;

      try {
          const data = await updateProperty({
              args: [propertyId, name, price, rent, rentPeriod, images, description, propertyAddress]
          });
          console.info("contract call success: ", data);
      } catch (err) {
          console.error("contract call failure");
      }
  }

  // --------------------------------------------

const {mutateAsync: purchaseListedShares} = useContractWrite(contract, "buyListedShares");

const buySharesFunction = async (formData) => {
    const { propertyId, shares, price } = formData;
    try {
        if (!contract || !address) {
            throw new Error("Contract or wallet not connected");
        }

        // Check for any unclaimed rent first
        const shareholderInfo = await contract.call('getShareholderInfo', [propertyId, address]);
        const unclaimedRent = shareholderInfo[2]; // UnclaimedRent

        // If there's unclaimed rent, claim it first and require success
        if (unclaimedRent.gt(0)) {
            try {
                await claimRent({
                    args: [propertyId, address]
                });
                console.info("Successfully claimed accrued rent before purchase");
            } catch (claimError) {
                console.error("Failed to claim accrued rent:", claimError);
                throw new Error("Please claim your accrued rent before buying additional shares");
            }
        }

        const priceInWei = ethers.utils.parseEther(price.toString());

        const data = await buyShares({
            args: [propertyId, shares, address],
            overrides: {
                value: priceInWei
            }
        });

        return data;

    } catch (error) {        
        if (error.message.includes('Transaction reverted without a reason') ||
            error.message.includes('missing revert data in call exception')) {
            throw new Error('Transaction failed - please check your wallet balance and try again');
        }
        
        throw error; // Propagate the error, including the rent claim requirement
    }
};

const buyListedSharesFunction = async (listingId, sharesToBuy) => {
    try {
        // Get listing details first
        const listingDetails = await contract.call('getListingDetails', [listingId]);
        
        if (!listingDetails || !listingDetails[1]) { // Check exists and isActive
            throw new Error('Invalid or inactive listing');
        }

        const propertyId = listingDetails[2];
        const seller = listingDetails[3];

        // Check for any unclaimed rent for the buyer if they already own shares
        const buyerInfo = await contract.call('getShareholderInfo', [propertyId, address]);
        const unclaimedRent = buyerInfo[2]; // UnclaimedRent

        // If buyer has unclaimed rent, claim it first
        if (unclaimedRent.gt(0)) {
            try {
                await claimRent({
                    args: [propertyId, address]
                });
                console.info("Successfully claimed buyer's accrued rent before purchase");
            } catch (claimError) {
                console.error("Failed to claim accrued rent:", claimError);
                throw new Error("Please claim your accrued rent before buying additional shares");
            }
        }

        // Get exact price per share from the listing
        const pricePerShare = ethers.BigNumber.from(listingDetails[5]); // pricePerShare
        const totalCost = pricePerShare.mul(sharesToBuy);

        const data = await contract.call('buyListedShares', [
            listingId,
            sharesToBuy
        ], {
            value: totalCost
        });

        console.info("Listed shares purchase successful", data);
        return data;
    } catch (error) {        
        if (error.message.includes('InvalidAmount')) {
            throw new Error('Invalid transaction amount. Please check the share price and quantity.');
        } else if (error.code === 'INSUFFICIENT_FUNDS' || 
                   error.message.includes('insufficient funds')) {
            throw new Error('Insufficient funds in wallet');
        }
        
        throw error;
    }
};

  //--------------------------------------------------------

  const {mutateAsync: payRent} = useContractWrite(contract, "payRent")

  const payRentFunction = async (formData) => {
    const { propertyId } = formData;
    try {
        if (!contract || !address) {
            throw new Error("Contract or wallet not connected");
        }
        const property = await contract.call('getProperty', [propertyId]);
        const lateFees = await contract.call('calculateLateFees', [propertyId]);
        const rentStatus = await contract.call('getRentStatus', [propertyId]);
        
        const totalRequired = ethers.BigNumber.from(property.rent)
            .add(lateFees)
            .add(rentStatus.totalDebt || 0);

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const balance = await provider.getBalance(address);

        if (balance.lt(totalRequired)) {
            throw new Error('INSUFFICIENT_FUNDS');
        }

        const isRentDue = await contract.call('isRentDue', [propertyId]);
        if (!isRentDue) {
            throw new Error('RENT_NOT_DUE');
        }

        const data = await payRent({
            args: [propertyId, address], 
            overrides: {
                value: totalRequired
            }
        });

        return data;

    } catch (error) {    
        if (error.message === 'INSUFFICIENT_FUNDS' || 
            error.code === 'INSUFFICIENT_FUNDS' ||
            error.message.includes('insufficient funds')) {
            throw new Error('Insufficient funds in wallet');
        } else if (error.message === 'RENT_NOT_DUE') {
            throw new Error('Rent is not due yet');
        } else if (error.message.includes('user rejected')) {
            throw new Error('Transaction cancelled by user');
        } else if (error.message.includes('execution reverted')) {
            throw new Error('Transaction failed - please check required amount');
        }
        
        throw new Error("Failed to pay rent");
    }
  };

  //--------------------------------------------------------
  const {mutateAsync: claimRent} = useContractWrite(contract, "claimRent");
  const claimRentFunction = async (formData) => {
    const {propertyId, shareholder} = formData;
    try {
        if (!propertyId || !shareholder) {
            throw new Error("Missing required parameters");
        }
        if (!ethers.utils.isAddress(shareholder)) {
            throw new Error("Invalid shareholder address");
        }

        const data = await claimRent({
            args: [propertyId, shareholder]
        });
        console.info("Rent claimed successfully", data);
        return data;

    } catch (error) {
        console.error("Failed to claim rent:", error);
        if (error.message.includes("NoRentToClaim")) {
            throw new Error("No rent available to claim");
        } else if (error.message.includes("InsufficientShares")) {
            throw new Error("You don't own any shares in this property");
        } else if (error.message.includes("TransferFailed")) {
            throw new Error("Failed to transfer rent. Please try again");
        }
        throw new Error("Failed to claim rent");
    }
  }

  //--------------------------------------------------------

  const {mutateAsync: submitReview} = useContractWrite(contract, "submitReview")
  const submitReviewFunction = async (formData) => {
    const { propertyId, rating, comment} = formData
    try {
      const data = await submitReview({
        args: [propertyId, address, rating, comment]
      })
      console.info("Review submitted succesfully", data)
    } catch (error) {
      throw new Error("Failed to submit review");
    }
  }

  //--------------------------------------------------------

  const {mutateAsync: removeProperty} = useContractWrite(contract, "removeProperty")
  const removePropertyFunction = async (formdata) => {
    const {propertyId} = formdata
    try {
      const data = await removeProperty({
        args: [propertyId, address]
      })
      console.info("Property removed")
    } catch (error) {
      throw new Error("Failed to remove property");
    }
  }

  //--------------------------------------------------------


  const listSharesForSaleFunction = async (propertyId, shares, pricePerShare) => {
    try {
      // Input validation
      if (!propertyId) throw new Error("Property ID is required");
      if (!shares || shares <= 0) throw new Error("Invalid number of shares");
      if (!pricePerShare || parseFloat(pricePerShare) <= 0) throw new Error("Invalid price per share");
      const priceInWei = ethers.utils.parseEther(pricePerShare.toString());
      const data = await listSharesForSale({
        args: [propertyId, shares, priceInWei]
      });

      return data;

    } catch (error) {
      console.error("Error in listSharesForSaleFunction:", error);
      if (error.message.includes("InsufficientShares")) {
        throw new Error("You don't have enough shares to list");
      } else if (error.message.includes("InvalidPrice")) {
        throw new Error("Invalid price");
      }
      
      throw new Error("Failed to list shares for sale");
    }
  };

  //--------------------------------------------------------

  const {mutateAsync: cancelListing} = useContractWrite(contract, "cancelListing");
  const cancelListingFunction = async (listingId) => {
    try {
      const data = await cancelListing({
        args: [listingId]
      });
      console.info("Listing cancelled successfully", data);
      return data;
    } catch (error) {
      throw new Error("Failed to cancel listing");
    }
  }

  //--------------------------------------------------------

  const {mutateAsync: updateListingPrice} = useContractWrite(contract, "updateListingPrice");
  const updateListingPriceFunction = async (formData) => {
    const {listingId, newPrice} = formData;
    try {
      const data = await updateListingPrice({
        args: [listingId, ethers.utils.parseEther(newPrice)]
      });
      console.info("Listing price updated successfully", data);
      return data;
    } catch (error) {
      throw new Error("Failed to update listing price");
    }
  }

  //--------------------------------------------------------

  const getActiveListingsFunction = async () => {
    try {
        if (!contract) {
            throw new Error("Contract not initialized");
        }
        const [listings, listingIds] = await contract.call('getAllListings');
        if (!listings || listings.length === 0) {
            return [];
        }

        const processedListings = listings.map((listing, index) => ({
            listingId: listingIds[index].toString(),
            propertyId: listing.propertyId.toString(),
            seller: listing.seller,
            numberOfShares: listing.numberOfShares.toString(),
            pricePerShare: listing.pricePerShare, 
            isActive: listing.isActive,
            listingTime: listing.listingTime.toString()
        }));

        return processedListings;
    } catch (error) {
        throw new Error("Error getting active listings");
    }
  };

  //--------------------------------------------------------

  const getPropertyListingsFunction = async (propertyId) => {
    try {
        if (!contract || !propertyId) {
            return [];
        }

        const listings = await contract.call('getPropertyListings', [propertyId]);

        const activeListings = listings
            .filter(listing => listing && listing.isActive)
            .map(listing => ({
                listingId: listing.listingId?.toString() || '0',
                propertyId: listing.propertyId?.toString() || propertyId.toString(),
                seller: listing.seller || '',
                numberOfShares: listing.numberOfShares?.toString() || '0',
                pricePerShare: listing.pricePerShare ? ethers.utils.formatEther(listing.pricePerShare) : '0',
                isActive: Boolean(listing.isActive),
                listingTime: listing.listingTime?.toString() || '0'
            }));

        return activeListings;
    } catch (error) {
        throw new Error("Error getting property listings");
    }
  }
  
  const getListingsByPriceRangeFunction = async (minPrice, maxPrice) => {
    try {
      const listings = await contract.call('getListingsByPriceRange', [
        ethers.utils.parseEther(minPrice),
        ethers.utils.parseEther(maxPrice)
      ]);
      const parsedListings = listings.map(listing => ({
        propertyId: listing.propertyId.toString(),
        seller: listing.seller,
        numberOfShares: listing.numberOfShares.toString(),
        pricePerShare: ethers.utils.formatEther(listing.pricePerShare),
        isActive: listing.isActive,
        listingTime: new Date(listing.listingTime.toNumber() * 1000)
      }));
      return parsedListings;
    } catch (error) {
      throw new Error("Failed to get listings by price range");
    }
  }

  //--------------------------------------------------------

  const getSinglePropertyFunction = useCallback(async (propertyId) => {
    try {
        if (!contract) return null;
        const property = await contract.call('getProperty', [propertyId]);

        const parsedProperty = [{
            propertyId: property.id.toString(),
            owner: property.owner,
            title: property.name,
            description: property.description,
            price: property.price.toString(),
            rent: property.rent.toString(),
            rentPeriod: property.rentPeriod.toString(),
            image: property.images,
            propertyAddress: property.propertyAddress,
            shares: property.totalShares?.toString(),
            AvailableShares: property.availableShares?.toString()

        }];
        if (!parsedProperty) {
          throw new Error("Property not found");
      }
        return parsedProperty;
    } catch (err) {
        throw new Error("Error getting single property");
    }
  }, [contract]);

  //--------------------------------------------------------

  const getUserListingsFunction = async (userAddress) => {
    try {
      const listings = await contract.call('getUserListings', [userAddress]);
      const parsedListings = listings.map(listing => ({
        propertyId: listing.propertyId.toString(),
        seller: listing.seller,
        numberOfShares: listing.numberOfShares.toString(),
        pricePerShare: ethers.utils.formatEther(listing.pricePerShare),
        isActive: listing.isActive,
        listingTime: new Date(listing.listingTime.toNumber() * 1000)
      }));
      return parsedListings;
    } catch (error) {
      throw new Error("Failed to get user listings");
    }
  }

  //--------------------------------------------------------------

  const getShareholderInfoFunction = async (propertyId) => {
    try {
      const shareholderInfo = await contract.call('getShareholderInfo', [propertyId, address]);
     
      return [{
        shares: shareholderInfo[0],       
        rentClaimed: shareholderInfo[1],   
        UnclaimedRent: shareholderInfo[2]  
      }];
    } catch (error) {
      throw new Error("Unable to fetch data");
    }
  };

  //--------------------------------------------------------------

  const getPropertyReviewsFunction = async (propertyId) => {
    try {
      const reviewData = await contract.call('getPropertyReviews', [propertyId]);
      
      if (!reviewData || !Array.isArray(reviewData)) {
        return [];
      }
      
      const parsedReviews = reviewData
        .filter(review => review && review.reviewer) 
        .map(review => ({
          reviewer: review.reviewer,
          rating: review.rating.toString(),
          comment: review.comment,
          timestamp: review.timestamp.toString()
        }));
      return parsedReviews;
    } catch (error) {
      throw new Error("Could not fetch reviews");
    }
  };

  const checkisRentDueFunction = async (propertyId) => {
    try{
      const check = await contract.call('isRentDue', [propertyId])
      return check
    } catch {
      throw new Error("couldn't fetch")
    }
  }

  
 //---------------------------------------------------------

  const getShareholderPropertiesFunction = async () => {
    try {
        const shareholderproperties = await contract.call('getShareholderProperties', [address]);
        const parsedProperties = shareholderproperties.map(property => ({
            propertyId: property.id.toString(),
            owner: property.owner,
            title: property.name,
            description: property.description,
            price: property.price.toString(),
            rent: property.rent.toString(),
            rentPeriod: property.rentPeriod.toString(),
            image: property.images,
            propertyAddress: property.propertyAddress
        }));
        return parsedProperties;
    } catch (error) {
        throw new Error("Couldn't fetch data");
    }
  }


  //------------------------------------------------------------

  const getOwnerPropertiesFunction = async () => {
    try {
        if (!address) return [];
        const ownerProperties = await contract.call('getOwnerProperties', [address]);
        const parsedProperties = ownerProperties.map(property => ({
            propertyId: property.id.toString(),
            owner: property.owner,
            name: property.name,
            description: property.description,
            price: property.price.toString(),
            rent: property.rent.toString(),
            rentPeriod: property.rentPeriod.toString(),
            images: property.images,
            propertyAddress: property.propertyAddress,
            shares: property.totalShares?.toString(),
            availableShares: property.availableShares?.toString()
        }));
        
        return parsedProperties;
    } catch (error) {
        throw new Error("Could not get owner properties");
    }
  }

  const getRentPeriodStatus = async (propertyId) => {
    try {
        const status = await contract.call('getRentPeriodStatus', [propertyId]);
        const startTimestamp = status.periodStart.toNumber();
        const endTimestamp = status.periodEnd.toNumber();
        
        return {
            periodStart: startTimestamp,  
            periodEnd: endTimestamp,     
            isActive: status.isActive,
            remainingTime: Number(status.remainingTime)
        };
    } catch (error) {
        throw new Error("Error getting rent period status");
    }
  };

  


  const getPropertyFunction = async (propertyId) => {
    try {
        if (!contract || !propertyId) {
            return null;
        }

        const property = await contract.call('getProperty', [propertyId]);

        const processedProperty = {
            id: property.id.toString(),
            owner: property.owner,
            name: property.name,
            price: property.price.toString(),
            totalShares: property.totalShares.toString(),
            availableShares: property.availableShares.toString(),
            rent: property.rent.toString(),
            rentPeriod: property.rentPeriod.toString(),
            images: property.images, 
            description: property.description,
            propertyAddress: property.propertyAddress
        };

        return [processedProperty]; 
    } catch (error) {
        throw new Error("Error in getPropertyFunction");
    }
  };

  const isPeriodClaimedFunction = async (propertyId, periodId, shareholder) => {
    try {
      const isClaimed = await contract.call('isPeriodClaimed', [propertyId, periodId, shareholder]);
      return isClaimed;
    } catch (error) {
      throw new Error("Error checking period claim status");
    }
  };

  const getRentPeriodsFunction = async (propertyId) => {
    try {
      const rentPeriods = await contract.call('getRentPeriodStatus', [propertyId]);
      
      return {
        periodStart: rentPeriods.periodStart ? new Date(rentPeriods.periodStart.toNumber() * 1000) : null,
        periodEnd: rentPeriods.periodEnd ? new Date(rentPeriods.periodEnd.toNumber() * 1000) : null,
        isActive: rentPeriods.isActive || false,
        remainingTime: rentPeriods.remainingTime ? rentPeriods.remainingTime.toNumber() : 0,
        rentAmount: rentPeriods.rentAmount ? ethers.utils.formatEther(rentPeriods.rentAmount) : "0"
      };
    } catch (error) {
      throw new Error("Error fetching rent periods");
    }
  };

  const getPlatformFeesFunction = async () => {
    try {
      const fees = await contract.call('getPlatformFees');
      return ethers.utils.formatEther(fees);
    } catch (error) {
      throw new Error("Error fetching platform fees");
    }
  };

  const getRentStatusFunction = async (propertyId) => {
    try {
        const status = await contract.call('getRentStatus', [propertyId]);
        return {
            isDefaulted: status.isDefaulted,
            missedPayments: status.missedPayments.toString(),
            totalDebt: ethers.utils.formatEther(status.totalDebt),
            nextDueDate: new Date(status.nextDueDate.toNumber() * 1000)
        };
    } catch (error) {
        throw new Error("Error getting rent status");
    }
  };

  const getLateFeeDistributionFunction = async (propertyId) => {
    try {
        const lateFees = await contract.call('calculateLateFees', [propertyId]);
        const shareholderPortion = lateFees.mul(SHAREHOLDER_LATE_FEE_SHARE).div(BASIS_POINTS);
        const platformPortion = lateFees.sub(shareholderPortion);
        
        return {
            totalLateFees: ethers.utils.formatEther(lateFees),
            shareholderPortion: ethers.utils.formatEther(shareholderPortion),
            platformPortion: ethers.utils.formatEther(platformPortion)
        };
    } catch (error) {
        throw new Error("Error calculating late fee distribution");
    }
  };

  const getAccruedRentFunction = async (propertyId, shareholder) => {
    try {
        if (!contract) {
            throw new Error("Contract not initialized");
        }

        if (!propertyId || !shareholder) {
            throw new Error("Missing required parameters");
        }

        if (!ethers.utils.isAddress(shareholder)) {
            throw new Error("Invalid shareholder address");
        }

        const rentInfo = await contract.call('getAccruedRent', [propertyId, shareholder]);
        
        return {
            accruedRent: ethers.utils.formatEther(rentInfo.accruedRent), 
            accruedRentWei: rentInfo.accruedRent, 
            periodStart: new Date(rentInfo.periodStart.toNumber() * 1000),
            periodEnd: new Date(rentInfo.periodEnd.toNumber() * 1000),
            lastClaim: new Date(rentInfo.lastClaim.toNumber() * 1000),
            isActive: rentInfo.periodEnd.toNumber() > Math.floor(Date.now() / 1000)
        };

    } catch (error) {
        throw new Error("Error getting accrued rent");
    }
  };

  const getRentPeriodInfo = async (propertyId) => {
    try {
        const [property, rentInfo] = await Promise.all([
            contract.call('properties', [propertyId]),
            contract.call('getAccruedRent', [propertyId, address])
        ]);

        const currentTimestamp = Math.floor(Date.now() / 1000);
        const periodStart = property.currentRentPeriodStart.toNumber();
        const periodEnd = property.currentRentPeriodEnd.toNumber();
        
        const isActive = (
            currentTimestamp >= periodStart &&
            currentTimestamp <= periodEnd &&
            property.rentPool.gt(0) 
        );

        return {
            periodStart: new Date(periodStart * 1000),
            periodEnd: new Date(periodEnd * 1000),
            isActive: isActive,
            remainingTime: isActive ? periodEnd - currentTimestamp : 0,
            rentPool: ethers.utils.formatEther(property.rentPool)
        };
    } catch (error) {
        throw new Error("Error getting rent period info");
    }
  }


  const propertyMessageFunction = async (propertyId, message) => {
    try {
        const data = await contract.call('postPropertyMessage', [propertyId, message]);
        return data;
    } catch (error) {
        throw new Error("Error posting property message");
    }
  };

  const deletePropertyMessageFunction = async (propertyId) => {
    try {
        const data = await contract.call('deletePropertyMessage', [propertyId]);
        return data;
    } catch (error) {
        throw new Error("Error deleting property message");
    }
  };

  const calculateLateFeesFunction = async (propertyId) => {
    try {
      if (!contract) throw new Error("Contract not initialized");
      
      const lateFees = await contract.call('calculateLateFees', [propertyId]);
      return lateFees;
    } catch (error) {
      console.error("Error calculating late fees:", error);
      return ethers.BigNumber.from(0); 
    }
  };

  useEffect(() => {
    const handleAccountsChanged = () => {
      window.location.reload();
    };

    const ethereum = getEthereum();
    if (ethereum) {
      ethereum.on('accountsChanged', handleAccountsChanged);
      
      return () => {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  const returnUnclaimedRentFunction = async (propertyId) => {
    try {
      if (!contract) {
        throw new Error("Contract not initialized");
      }

      if (!propertyId) {
        throw new Error("Property ID is required");
      }
      const tx = await contract.call('returnUnclaimedRent', [propertyId]);
      return tx;
    } catch (error) {
      throw new Error(error.message || "Failed to return unclaimed rent");
    }
  };

  const contextValue = {
    contract,
    address,
    disconnect,
    signer,
    userBalance,
    connect,
    isConnecting,
    connectionError,
    listPropertyFunction,
    getPropertiesFunction,
    updatePropertyFunction,
    buySharesFunction,
    payRentFunction,
    claimRentFunction,
    submitReviewFunction,
    getSinglePropertyFunction,
    removePropertyFunction,
    getShareholderInfoFunction,
    getPropertyReviewsFunction,
    checkisRentDueFunction,
    getShareholderPropertiesFunction,
    getOwnerPropertiesFunction,
    getRentPeriodStatus,
    listSharesForSaleFunction,
    buyListedSharesFunction,
    cancelListingFunction,
    updateListingPriceFunction,
    getActiveListingsFunction,
    getPropertyListingsFunction,
    getListingsByPriceRangeFunction,
    propertyMessageFunction,
    getUserListingsFunction,
    getPropertyFunction,
    isPeriodClaimedFunction,
    getRentPeriodsFunction,
    getPlatformFeesFunction,
    getRentStatusFunction,
    getLateFeeDistributionFunction,
    getAccruedRentFunction,
    getRentPeriodInfo,
    deletePropertyMessageFunction,
    calculateLateFeesFunction,
    returnUnclaimedRentFunction,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};






