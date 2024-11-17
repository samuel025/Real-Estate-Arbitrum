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

  const {contract} = useContract("0x5441FA1BeDe9AE0d359B068ebEa1f691A928C414")
  const {mutateAsync: listSharesForSale} = useContractWrite(contract, "listSharesForSale")
  const { mutateAsync: buyShares } = useContractWrite(contract, "purchaseShares");

  const address = useAddress();
  const connectWithMetamask = useMetamask()
  const disconnect = useDisconnect();
  const signer = useSigner();

  // Set up event listeners when component mounts
  useEffect(() => {
    const ethereum = getEthereum();
    if (ethereum) {
      // Add event listeners
      ethereum.on('accountsChanged', handleAccountsChanged);
      ethereum.on('chainChanged', handleChainChanged);

      // Check initial connection
      const checkConnection = async () => {
        try {
          const accounts = await ethereum.request({
            method: 'eth_accounts'
          });
          
          if (accounts.length > 0) {
            // Check if we're on the correct network
            const chainId = await ethereum.request({ 
              method: 'eth_chainId' 
            });

            if (chainId !== '0x66eee') {
              await ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x66eee' }],
              });
            }
            
            // Connect with ThirdWeb
            await connectWithMetamask();
          }
        } catch (error) {
          console.error('Error checking connection:', error);
        }
      };

      checkConnection();
    }

    // Cleanup function
    return () => {
      if (ethereum) {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
        ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  // Update handleAccountsChanged to properly handle disconnection
  const handleAccountsChanged = async (accounts) => {
    if (accounts.length === 0) {
      // Handle disconnection
      disconnect();
      // You might want to update your UI state here
    } else {
      // Handle account change
      const ethereum = getEthereum();
      if (ethereum) {
        const chainId = await ethereum.request({ 
          method: 'eth_chainId' 
        });
        
        if (chainId !== '0x66eee') {
          await connect(); // This will handle network switching
        }
      }
    }
  };

  // Update handleChainChanged to properly handle network changes
  const handleChainChanged = async (_chainId) => {
    if (_chainId !== '0x66eee') {
      await connect(); // This will handle network switching
    }
    // Optionally refresh the page as recommended by MetaMask
    window.location.reload();
  };

  // Safely check for window.ethereum and prioritize MetaMask
  const getEthereum = () => {
    if (typeof window !== 'undefined') {
      // Check if we're on HTTPS
      const isHttps = window.location.protocol === 'https:';
      
      // Check for multiple providers
      if (window.ethereum?.providers) {
        const metaMaskProvider = window.ethereum.providers.find(provider => provider.isMetaMask);
        if (metaMaskProvider) {
          // Ensure provider is ready for HTTPS
          if (isHttps) {
            metaMaskProvider.enable = metaMaskProvider.request.bind(metaMaskProvider, {
              method: 'eth_requestAccounts'
            });
          }
          return metaMaskProvider;
        }
        return window.ethereum.providers[0];
      }
      
      // Single provider case
      if (window.ethereum) {
        // Ensure provider is ready for HTTPS
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
        // Ensure we're handling the connection securely
        if (ethereum.isMetaMask) {
          try {
            // First try the modern way
            await ethereum.request({ method: 'eth_requestAccounts' });
          } catch (requestError) {
            // Fallback to legacy method if needed
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

        // Check network after successful connection
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
            // Handle network switch or add
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

        // Get accounts after network is confirmed
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
          console.error("contract call failure: ", err);
      }
  }

  // --------------------------------------------

const {mutateAsync: purchaseListedShares} = useContractWrite(contract, "buyListedShares");

// Initial share purchase function
const buySharesFunction = async (formData) => {
    const { propertyId, shares, price } = formData;
    try {
        if (!contract || !address) {
            throw new Error("Contract or wallet not connected");
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
        console.error("Error in buySharesFunction:", error);
        
        if (error.message.includes('Transaction reverted without a reason') ||
            error.message.includes('missing revert data in call exception')) {
            throw new Error('Transaction failed - please check your wallet balance and try again');
        }
        
        throw error;
    }
};

// Marketplace share purchase function
const buyListedSharesFunction = async (listingId, sharesToBuy, overrides) => {
    try {
        if (!overrides || !overrides.value) {
            throw new Error('Invalid transaction value');
        }

        // Check user's balance before proceeding
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const balance = await provider.getBalance(address);
        
        if (balance.lt(overrides.value)) {
            throw new Error('INSUFFICIENT_FUNDS');
        }

        // Debug the listing before purchase
        const listingDetails = await contract.call('getListingDetails', [listingId]);

        if (!listingDetails.exists || !listingDetails.isActive) {
            throw new Error('Invalid or inactive listing');
        }

        const data = await purchaseListedShares({
            args: [listingId, sharesToBuy],
            overrides: overrides
        });
        console.info("Listed shares purchase successful", data);
        return data;
    } catch (error) {
        console.error("Failed to purchase listed shares", error);
        
        // Handle specific error types
        if (error.message === 'INSUFFICIENT_FUNDS') {
            throw new Error('Insufficient funds in wallet');
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

        // Get all the required amounts
        const property = await contract.call('getProperty', [propertyId]);
        const lateFees = await contract.call('calculateLateFees', [propertyId]);
        const rentStatus = await contract.call('getRentStatus', [propertyId]);
        
        // Calculate total required amount
        const totalRequired = ethers.BigNumber.from(property.rent)
            .add(lateFees)
            .add(rentStatus.totalDebt || 0);

        // Check user's balance before proceeding
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const balance = await provider.getBalance(address);

        if (balance.lt(totalRequired)) {
            throw new Error('INSUFFICIENT_FUNDS');
        }

        // Verify rent is actually due
        const isRentDue = await contract.call('isRentDue', [propertyId]);
        if (!isRentDue) {
            throw new Error('RENT_NOT_DUE');
        }

        // Pass both propertyId and payer address to the contract
        const data = await payRent({
            args: [propertyId, address], // Add the payer's address here
            overrides: {
                value: totalRequired
            }
        });

        console.info("Rent payment successful:", data);
        return data;

    } catch (error) {
        console.error("Error in payRentFunction:", error);
        
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
        
        throw error;
    }
  };

  //--------------------------------------------------------
  const {mutateAsync: claimRent} = useContractWrite(contract, "claimRent");
  const claimRentFunction = async (formData) => {
    const {propertyId, shareholder} = formData;
    try {
        // Validate inputs
        if (!propertyId || !shareholder) {
            throw new Error("Missing required parameters");
        }

        // Ensure shareholder is a valid address
        if (!ethers.utils.isAddress(shareholder)) {
            throw new Error("Invalid shareholder address");
        }

        const data = await claimRent({
            args: [propertyId, shareholder]
        });

        // Wait for transaction confirmation
        console.info("Rent claimed successfully", data);
        return data;

    } catch (error) {
        console.error("Failed to claim rent:", error);
        // Handle specific contract errors
        if (error.message.includes("NoRentToClaim")) {
            throw new Error("No rent available to claim");
        } else if (error.message.includes("RentPeriodNotEnded")) {
            throw new Error("Rent period not ended");
        }
        throw error;
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
      console.error("failed to submit review", error)
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
      console.error("failed to remove property")
    }
  }

  //--------------------------------------------------------


  const listSharesForSaleFunction = async (propertyId, shares, pricePerShare) => {
    try {
      // Input validation
      if (!propertyId) throw new Error("Property ID is required");
      if (!shares || shares <= 0) throw new Error("Invalid number of shares");
      if (!pricePerShare || parseFloat(pricePerShare) <= 0) throw new Error("Invalid price per share");

      // Convert price to Wei for the contract
      const priceInWei = ethers.utils.parseEther(pricePerShare.toString());

      // Execute the listing
      const data = await listSharesForSale({
        args: [propertyId, shares, priceInWei]
      });

      console.info("Shares listed successfully:", data);
      return data;

    } catch (error) {
      console.error("Error in listSharesForSaleFunction:", error);
      
      // Handle specific contract errors
      if (error.message.includes("InsufficientShares")) {
        throw new Error("You don't have enough shares to list");
      } else if (error.message.includes("InvalidPrice")) {
        throw new Error("Invalid price");
      }
      
      throw error;
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
      console.error("Failed to cancel listing", error);
      throw error;
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
      console.error("Failed to update listing price", error);
      throw error;
    }
  }

  //--------------------------------------------------------

  const getActiveListingsFunction = async () => {
    try {
        if (!contract) {
            console.error("Contract not initialized");
            return [];
        }
        const [listings, listingIds] = await contract.call('getAllListings');

        // If no listings found
        if (!listings || listings.length === 0) {
            return [];
        }

        // Process and return the listings
        const processedListings = listings.map((listing, index) => ({
            listingId: listingIds[index].toString(),
            propertyId: listing.propertyId.toString(),
            seller: listing.seller,
            numberOfShares: listing.numberOfShares.toString(),
            pricePerShare: listing.pricePerShare, // Keep as BigNumber for now
            isActive: listing.isActive,
            listingTime: listing.listingTime.toString()
        }));

        return processedListings;
    } catch (error) {
        console.error("Error getting active listings:", error);
        return [];
    }
  };

  //--------------------------------------------------------

  const getPropertyListingsFunction = async (propertyId) => {
    try {
        if (!contract || !propertyId) {
            return [];
        }

        const listings = await contract.call('getPropertyListings', [propertyId]);

        // Map and filter active listings
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
        console.error("Error getting property listings:", error);
        return [];
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
      console.error("Failed to get listings by price range", error);
      throw error;
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
        console.error("Error getting single property:", err);
        return null;
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
      console.error("Failed to get user listings", error);
      throw error;
    }
  }

  //--------------------------------------------------------------

  const getShareholderInfoFunction = async (propertyId) => {
    try {
      const shareholderInfo = await contract.call('getShareholderInfo', [propertyId, address]);
     
      return [{
        shares: shareholderInfo[0],        // shares
        rentClaimed: shareholderInfo[1],   // rentClaimed
        UnclaimedRent: shareholderInfo[2]  // unclaimedRent
      }];
    } catch (error) {
      console.error("Unable to fetch data:", error);
      return null;
    }
  };

  //--------------------------------------------------------------

  const getPropertyReviewsFunction = async (propertyId) => {
    try {
      const reviewData = await contract.call('getPropertyReviews', [propertyId]);
      
      // Check if reviewData exists and has the expected structure
      if (!reviewData || !Array.isArray(reviewData)) {
        return [];
      }
      
      const parsedReviews = reviewData
        .filter(review => review && review.reviewer) // Filter out any null or invalid reviews
        .map(review => ({
          reviewer: review.reviewer,
          rating: review.rating.toString(),
          comment: review.comment,
          timestamp: review.timestamp.toString()
        }));
      
      return parsedReviews;
    } catch (error) {
      console.error("Could not fetch reviews:", error);
      return [];
    }
  };

  const checkisRentDueFunction = async (propertyId) => {
    try{
      const check = await contract.call('isRentDue', [propertyId])
      return check
    } catch {
      console.error("couldn't fetch")
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
        console.error("Couldn't fetch data");
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
        console.error("Error in getOwnerPropertiesFunction:", error);
        throw error;
    }
  }

  const getRentPeriodStatus = async (propertyId) => {
    try {
        const status = await contract.call('getRentPeriodStatus', [propertyId]);
        const startTimestamp = status.periodStart.toNumber();
        const endTimestamp = status.periodEnd.toNumber();
        
        return {
            periodStart: startTimestamp,  // Keep as timestamp
            periodEnd: endTimestamp,      // Keep as timestamp
            isActive: status.isActive,
            remainingTime: Number(status.remainingTime)
        };
    } catch (error) {
        console.error("Error getting rent period status:", error);
        throw error;
    }
  };

  


  const getPropertyFunction = async (propertyId) => {
    try {
        if (!contract || !propertyId) {
            return null;
        }

        const property = await contract.call('getProperty', [propertyId]);

        // Process the property data
        const processedProperty = {
            id: property.id.toString(),
            owner: property.owner,
            name: property.name,
            price: property.price.toString(),
            totalShares: property.totalShares.toString(),
            availableShares: property.availableShares.toString(),
            rent: property.rent.toString(),
            rentPeriod: property.rentPeriod.toString(),
            images: property.images, // Make sure this is a valid URL
            description: property.description,
            propertyAddress: property.propertyAddress
        };

        return [processedProperty]; // Keeping the array format as expected by the marketplace
    } catch (error) {
        console.error("Error in getPropertyFunction:", error);
        return null;
    }
  };

  const isPeriodClaimedFunction = async (propertyId, periodId, shareholder) => {
    try {
      const isClaimed = await contract.call('isPeriodClaimed', [propertyId, periodId, shareholder]);
      return isClaimed;
    } catch (error) {
      console.error("Error checking period claim status:", error);
      throw error;
    }
  };

  // Add getRentPeriodsFunction
  const getRentPeriodsFunction = async (propertyId) => {
    try {
      const rentPeriods = await contract.call('getRentPeriodStatus', [propertyId]);
      
      // Add null checks and default values
      return {
        periodStart: rentPeriods.periodStart ? new Date(rentPeriods.periodStart.toNumber() * 1000) : null,
        periodEnd: rentPeriods.periodEnd ? new Date(rentPeriods.periodEnd.toNumber() * 1000) : null,
        isActive: rentPeriods.isActive || false,
        remainingTime: rentPeriods.remainingTime ? rentPeriods.remainingTime.toNumber() : 0,
        rentAmount: rentPeriods.rentAmount ? ethers.utils.formatEther(rentPeriods.rentAmount) : "0"
      };
    } catch (error) {
      console.error("Error fetching rent periods:", error);
      throw error;
    }
  };

  // Add function to get platform fees
  const getPlatformFeesFunction = async () => {
    try {
      const fees = await contract.call('getPlatformFees');
      return ethers.utils.formatEther(fees);
    } catch (error) {
      console.error("Error fetching platform fees:", error);
      throw error;
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
        console.error("Error getting rent status:", error);
        throw error;
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
        console.error("Error calculating late fee distribution:", error);
        throw error;
    }
  };

  const getAccruedRentFunction = async (propertyId, shareholder) => {
    try {
        // Contract initialization check
        if (!contract) {
            throw new Error("Contract not initialized");
        }

        // Input validation
        if (!propertyId || !shareholder) {
            throw new Error("Missing required parameters");
        }

        if (!ethers.utils.isAddress(shareholder)) {
            throw new Error("Invalid shareholder address");
        }

        const rentInfo = await contract.call('getAccruedRent', [propertyId, shareholder]);
        
        // Format the response
        return {
            accruedRent: ethers.utils.formatEther(rentInfo.accruedRent), // Convert to ETH
            accruedRentWei: rentInfo.accruedRent, // Keep original BigNumber
            periodStart: new Date(rentInfo.periodStart.toNumber() * 1000),
            periodEnd: new Date(rentInfo.periodEnd.toNumber() * 1000),
            lastClaim: new Date(rentInfo.lastClaim.toNumber() * 1000),
            isActive: rentInfo.periodEnd.toNumber() > Math.floor(Date.now() / 1000)
        };

    } catch (error) {
        console.error("Error getting accrued rent:", error);
        throw error;
    }
  };

  const getRentPeriodInfo = async (propertyId) => {
    try {
        // Get property data and accrued rent info
        const [property, rentInfo] = await Promise.all([
            contract.call('properties', [propertyId]),
            contract.call('getAccruedRent', [propertyId, address])
        ]);

        const currentTimestamp = Math.floor(Date.now() / 1000);
        const periodStart = property.currentRentPeriodStart.toNumber();
        const periodEnd = property.currentRentPeriodEnd.toNumber();
        
        // Match contract logic for active status
        const isActive = (
            currentTimestamp >= periodStart &&
            currentTimestamp <= periodEnd &&
            property.rentPool.gt(0) // Check if rentPool is greater than 0
        );

        return {
            periodStart: new Date(periodStart * 1000),
            periodEnd: new Date(periodEnd * 1000),
            isActive: isActive,
            remainingTime: isActive ? periodEnd - currentTimestamp : 0,
            rentPool: ethers.utils.formatEther(property.rentPool)
        };
    } catch (error) {
        console.error("Error getting rent period info:", error);
        throw error;
    }
  }


  const propertyMessageFunction = async (propertyId, message) => {
    try {
        const data = await contract.call('postPropertyMessage', [propertyId, message]);
        return data;
    } catch (error) {
        console.error("Error posting property message:", error);
        throw error;
    }
  };

  const deletePropertyMessageFunction = async (propertyId) => {
    try {
        const data = await contract.call('deletePropertyMessage', [propertyId]);
        return data;
    } catch (error) {
        console.error("Error deleting property message:", error);
        throw error;
    }
  };

  // Add calculateLateFeesFunction
  const calculateLateFeesFunction = async (propertyId) => {
    try {
      if (!contract) throw new Error("Contract not initialized");
      
      const lateFees = await contract.call('calculateLateFees', [propertyId]);
      return lateFees;
    } catch (error) {
      console.error("Error calculating late fees:", error);
      return ethers.BigNumber.from(0); // Return zero if there's an error
    }
  };

  // Add effect to handle address changes
  useEffect(() => {
    const handleAccountsChanged = () => {
      window.location.reload();
    };

    const ethereum = getEthereum();
    if (ethereum) {
      ethereum.on('accountsChanged', handleAccountsChanged);
      
      // Cleanup
      return () => {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

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
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};






