import React, { createContext, useContext, useState, useEffect } from "react";

import { 
    useAddress,
    useContract,
    useContractWrite,
    useMetamask,
    useSigner,
    useDisconnect,
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
  const {contract} = useContract("0x3136aF1BaE6744d7EC8abe5bcaF89B5C916E5aD8")
  const {mutateAsync: listSharesForSale} = useContractWrite(contract, "listSharesForSale")

  const address = useAddress();
  const connectWithMetamask = useMetamask()
  const disconnect = useDisconnect();
  const signer = useSigner();




  const connect = async () => {
    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum === "undefined") {
        alert("Please install MetaMask to use this application");
        window.open("https://metamask.io/download/", "_blank");
        return;
      }

      try {
        // Request account access
        await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        
        // Connect with MetaMask
        await connectWithMetamask();
        
        // Check and switch network
        const currentChainId = await window.ethereum.request({ 
          method: 'eth_chainId' 
        });
        
        if (currentChainId !== '0x66eee') { // Arbitrum Sepolia
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x66eee' }],
            });
          } catch (switchError) {
            // Handle chain not added to MetaMask
            if (switchError.code === 4902) {
              try {
                await window.ethereum.request({
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
              } catch (addError) {
                console.error('Error adding network:', addError);
                alert('Failed to add Arbitrum Sepolia network to MetaMask');
                return;
              }
            } else {
              console.error('Error switching network:', switchError);
              alert('Failed to switch to Arbitrum Sepolia network');
              return;
            }
          }
        }

        // Add event listeners for account and chain changes
        window.ethereum.on('accountsChanged', (accounts) => {
          if (accounts.length === 0) {
            // Handle disconnection
            disconnect();
          } else {
            // Handle account change
            window.location.reload();
          }
        });

        window.ethereum.on('chainChanged', (_chainId) => {
          // Handle chain change by reloading the page
          window.location.reload();
        });

      } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Failed to connect wallet. Please try again.');
        return;
      }
    } catch (error) {
      console.error('Connection error:', error);
      alert('Failed to connect wallet. Please make sure MetaMask is installed and unlocked.');
      return;
    }
  };

  // Add cleanup for event listeners
  useEffect(() => {
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', null);
        window.ethereum.removeListener('chainChanged', null);
      }
    };
  }, []);

  // Add a function to check if wallet is already connected
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts'
          });
          if (accounts.length > 0) {
            // Wallet is already connected
            connect();
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error);
        }
      }
    };

    checkConnection();
  }, []);



  const [userBalance, setUserBalance] = useState("");
  useEffect(() => {
    const fetchBalance = async () => {
      if (signer) {
        try {
          const balance = await signer.getBalance();
          const formattedBalance = parseFloat(ethers.utils.formatEther(balance)).toFixed(3); // Limit to 3 decimal places
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

  const {mutateAsync: listProperty} = useContractWrite(contract, "listProperty");
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

  const getPropertiesFunction = async () => {
    try {
      const properties = await contract.call('getAllProperties');
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
        totalShares: property.totalShares.toString(),
        availableShares: property.availableShares.toString(),
        rentPool: property.rentPool.toString(),
        lastRentPayment: property.lastRentPayment.toString(),
        currentRentPeriodStart: property.currentRentPeriodStart.toString(),
        currentRentPeriodEnd: property.currentRentPeriodEnd.toString(),
        isListed: property.isListed,
        totalRentCollected: property.totalRentCollected.toString()
      }));

      return parsedProperties;
    } catch (error) {
      console.error("Error fetching properties:", error);
      throw error;
    }
  };

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

const {mutateAsync: purchaseInitialShares} = useContractWrite(contract, "purchaseShares");
const {mutateAsync: purchaseListedShares} = useContractWrite(contract, "buyListedShares");

// Initial share purchase function
const buySharesFunction = async (formData) => {
  const {propertyId, shares, price} = formData;
  try {
    const data = await purchaseInitialShares({
      args: [propertyId, shares, address],
      overrides: {
        value: ethers.utils.parseEther(price) 
      }
    });
    console.info("Initial shares purchase successful", data);
    return data;
  } catch (error) {
    console.error("Failed to purchase initial shares", error);
    throw error;
  }
}

// Marketplace share purchase function
const buyListedSharesFunction = async (listingId, sharesToBuy, overrides) => {
    try {
        if (!overrides || !overrides.value) {
            throw new Error('Invalid transaction value');
        }

        // Debug the listing before purchase
        const listingDetails = await contract.call('getListingDetails', [listingId]);
        console.log('Attempting to buy from listing:', listingDetails);

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
        throw error;
    }
};

// --------------------------------------------

const {mutateAsync: addLiquidity} = useContractWrite(contract, "addLiquidity");
const addLiquidityFunction = async (amount) => {
  try {
    const data = await addLiquidity({
      overrides: {
        value: ethers.utils.parseEther(amount) 
      }
    });
    console.info("contract call success", data);
  } catch (error) {
    console.error("contract call failure", error);
    throw Error
  }
}

// --------------------------------------------

const {mutateAsync: removeLiquidity} = useContractWrite(contract, "removeLiquidity");
const removeLiquidityFunction = async (amount) => {
  try {
    const data = await removeLiquidity({
      args: [ethers.utils.parseEther(amount)]
    });
    console.info("contract call success", data);
  } catch (error) {
    console.error("contract call failure", error);
  }
}

// -------------------------------------------

  const getLiquidityBalanceFunction = async (providerAddress) => {
    try {
      const balance = await contract.call('getLiquidityBalance',[providerAddress]);
      return ethers.utils.formatEther(balance.toString()); 
    } catch (error) {
      console.error("contract call failure", error);
      throw error
    }
  }

  //--------------------------------------------------------

  const {mutateAsync: payRent} = useContractWrite(contract, "payRent")

  const payRentFunction = async (formData) => {
    const {propertyId, rent} = formData;
    try {
      // Send only the base rent amount
      const data = await payRent({
        args: [propertyId, address],
        overrides: {
          value: ethers.BigNumber.from(rent) // Use only the base rent amount
        }
      });
      
      console.info("Rent payment successful:", data);
      return data;
    } catch (error) {
      console.error("Error in payRentFunction:", error);
      throw error;
    }
  }

  //--------------------------------------------------------
  const {mutateAsync: claimRent} = useContractWrite(contract, "claimRent");
  const claimRentFunction = async (formData) => {
    const {propertyId, shareholder} = formData;
    try {
      const data = await claimRent({
        args: [propertyId, shareholder]
      });
      console.info("contract call success", data);
    } catch (error) {
      console.error("contract call failure", error);
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

        console.log("Getting active listings from contract...");
        const [listings, listingIds] = await contract.call('getAllListings');
        console.log("Raw response:", { listings, listingIds });

        // If no listings found
        if (!listings || listings.length === 0) {
            console.log("No listings found");
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

        console.log("Processed listings:", processedListings);
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
            console.log("Missing parameters:", { contract, propertyId });
            return [];
        }

        const listings = await contract.call('getPropertyListings', [propertyId]);
        console.log("Raw listings from contract:", listings);

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

        console.log("Formatted active listings:", activeListings);
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

  const getSinglePropertyFunction = async (propertyId) => {
    try {
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
  }

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
      console.log('Raw review data:', reviewData);
      
      if (!reviewData) return [];
      
      const parsedReviews = reviewData.map(review => ({
        reviewer: review.reviewer,
        rating: review.rating.toString(),
        comment: review.comment,
        timestamp: review.timestamp.toString()
      }));
      
      console.log('Parsed reviews:', parsedReviews);
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
        
        console.log("Fetching properties for address:", address);
        const ownerProperties = await contract.call('getOwnerProperties', [address]);
        console.log("Raw owner properties:", ownerProperties);
        
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
        
        console.log("Parsed properties:", parsedProperties);
        return parsedProperties;
    } catch (error) {
        console.error("Error in getOwnerPropertiesFunction:", error);
        throw error;
    }
  }

  const getRentPeriodStatus = async (propertyId) => {
    try {
        const status = await contract.call('getRentPeriodStatus', [propertyId]);
        console.log("Raw status from contract:", status); // Debug log

        // Convert BigNumber to number before multiplying
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
            console.log("Missing parameters for getPropertyFunction:", { contract, propertyId });
            return null;
        }

        const property = await contract.call('getProperty', [propertyId]);
        console.log("Raw property data:", property);

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

        console.log("Processed property:", processedProperty);
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
      // Input validation
      if (!propertyId || !shareholder) {
        console.log("Missing required parameters:", { propertyId, shareholder });
        return {
          accruedRent: "0",
          periodStart: new Date(),
          periodEnd: new Date(),
          lastClaim: new Date()
        };
      }

      const rentInfo = await contract.call('getAccruedRent', [propertyId, shareholder]);
      
      // Safely handle the returned values
      return {
        accruedRent: rentInfo.accruedRent ? ethers.utils.formatEther(rentInfo.accruedRent) : "0",
        periodStart: rentInfo.periodStart ? new Date(rentInfo.periodStart.toNumber() * 1000) : new Date(),
        periodEnd: rentInfo.periodEnd ? new Date(rentInfo.periodEnd.toNumber() * 1000) : new Date(),
        lastClaim: rentInfo.lastClaim ? new Date(rentInfo.lastClaim.toNumber() * 1000) : new Date()
      };
    } catch (error) {
      console.error("Error getting accrued rent:", error);
      // Return safe default values on error
      return {
        accruedRent: "0",
        periodStart: new Date(),
        periodEnd: new Date(),
        lastClaim: new Date()
      };
    }
  };

  const getRentPeriodInfo = async (propertyId) => {
    try {
        const data = await contract.call('getRentPeriodStatus', [propertyId]);
        // Only return period info if status is active
        if (data.isActive) {
            return {
                periodStart: new Date(data.periodStart.toNumber() * 1000),
                periodEnd: new Date(data.periodEnd.toNumber() * 1000),
                isActive: true,
                remainingTime: data.remainingTime.toNumber()
            };
        } else {
            return {
                isActive: false,
                remainingTime: 0
            };
        }
    } catch (error) {
        console.error("Error getting rent period info:", error);
        throw error;
    }
  }

  const value = {
    contract,
    address,
    disconnect,
    signer,
    userBalance,
    connect,
    listPropertyFunction,
    getPropertiesFunction,
    updatePropertyFunction,
    buySharesFunction,
    addLiquidityFunction,
    removeLiquidityFunction,
    getLiquidityBalanceFunction,
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
    getUserListingsFunction,
    getPropertyFunction,
    isPeriodClaimedFunction,
    getRentPeriodsFunction,
    getPlatformFeesFunction,
    getRentStatusFunction,
    getLateFeeDistributionFunction,
    getAccruedRentFunction,
    getRentPeriodInfo,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};






