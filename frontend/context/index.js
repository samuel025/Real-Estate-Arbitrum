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
  const {contract} = useContract("0x3e488Bb2eE72A6E89f6D9fe526dF77Ea8E751aad")

  const address = useAddress();
  const connectWithMetamask = useMetamask()
  const disconnect = useDisconnect();
  const signer = useSigner();




  const connect = async () => {
    try {
      if (typeof window.ethereum === "undefined") {
        throw new Error("Please install MetaMask");
      }

      // First connect the wallet
      await connectWithMetamask();
      
      // Check if we're already on Arbitrum Sepolia
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      if (currentChainId !== '0x66eee') { // 421614 in hex
        try {
          // Try to switch to Arbitrum Sepolia
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x66eee' }],
          });
        } catch (switchError) {
          // If the network hasn't been added to MetaMask
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
              console.error('Error adding the network:', addError);
              throw new Error('Failed to add Arbitrum Sepolia network');
            }
          } else {
            console.error('Error switching network:', switchError);
            throw switchError;
          }
        }
      }
    } catch (error) {
      console.error('Connection error:', error);
      throw error;
    }
  };



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

const {mutateAsync: buyShares} = useContractWrite(contract, "purchaseShares");
const buySharesFunction = async (formData) => {
  const {propertyId, shares, price} = formData;
  try {
    const data = await buyShares({
      args: [propertyId, shares, address],
      overrides: {
        value: ethers.utils.parseEther(price) 
      }
    });
    console.info("contract call success", data);
  } catch (error) {
    console.error("contract call failure", error);
  }
}

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
      // Calculate total required amount including any late fees or debt
      const lateFees = await contract.call('calculateLateFees', [propertyId]);
      const rentStatus = await contract.call('getRentStatus', [propertyId]);
      
      // Total amount needed = rent + late fees + any existing debt
      const totalRequired = ethers.BigNumber.from(rent)
        .add(lateFees)
        .add(rentStatus.totalDebt || 0);

      const data = await payRent({
        args: [propertyId, address],
        overrides: {
          value: totalRequired // Send the total required amount
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


  const {mutateAsync: listShares} = useContractWrite(contract, "listSharesForSale")
  const listSharesForSaleFunction = async (formData) => {
    const { propertyId, shares, pricePerShare } = formData;
    try {
      // Convert values to BigNumber explicitly
      const propertyIdBN = ethers.BigNumber.from(propertyId);
      const sharesBN = ethers.BigNumber.from(shares);
      const priceInWei = ethers.utils.parseUnits(pricePerShare, 18); // Use parseUnits for better precision

      // Log the actual values being sent
      console.log("Sending to contract:", {
        propertyId: propertyIdBN.toString(),
        shares: sharesBN.toString(),
        priceInWei: priceInWei.toString(),
        priceInEth: ethers.utils.formatEther(priceInWei)
      });

      // Call contract with raw BigNumber values
      const data = await listShares({
        args: [propertyIdBN, sharesBN, priceInWei]
      });

      return data;
    } catch (error) {
      console.error("Contract call failed with values:", {
        propertyId,
        shares,
        pricePerShare
      });
      throw error;
    }
  };


  //--------------------------------------------------------

  const {mutateAsync: buyListedShares} = useContractWrite(contract, "buyListedShares");
  const buyListedSharesFunction = async (listingId, sharesToBuy, pricePerShare) => {
    try {
        // Calculate total cost for the number of shares being bought
        const totalCost = ethers.utils.parseEther(pricePerShare).mul(sharesToBuy);
        
        const data = await buyListedShares({
            args: [listingId, sharesToBuy], // Add sharesToBuy parameter
            overrides: {
                value: totalCost // Send exact amount for shares being purchased
            }
        });
        console.info("contract call success", data);
        return data;
    } catch (error) {
        console.error("contract call failure", error);
        throw error;
    }
  }

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
        const listings = await contract.call('getAllListings'); // Updated function name
        const parsedListings = listings.map(listing => ({
            propertyId: listing.propertyId.toString(),
            seller: listing.seller,
            numberOfShares: listing.numberOfShares.toString(),
            pricePerShare: ethers.utils.formatEther(listing.pricePerShare),
            isActive: listing.isActive,
            listingTime: new Date(listing.listingTime.toNumber() * 1000),
            accumulatedRent: ethers.utils.formatEther(listing.accumulatedRent)
        }));
        return parsedListings;
    } catch (error) {
        console.error("Failed to get active listings", error);
        throw error;
    }
  }

  //--------------------------------------------------------

  const getPropertyListingsFunction = async (propertyId) => {
    try {
      const listings = await contract.call('getPropertyListings', [propertyId]);
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
      console.error("Failed to get property listings", error);
      throw error;
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
      return {
        periodStart: new Date(status.periodStart * 1000),
        periodEnd: new Date(status.periodEnd * 1000),
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
      const property = await contract.call('getProperty', [propertyId]);
      return {
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
      };
    } catch (error) {
      console.error("Error fetching property:", error);
      throw error;
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
      const rentInfo = await contract.call('getAccruedRent', [propertyId, shareholder]);
      
      return {
        accruedRent: ethers.utils.formatEther(rentInfo.accruedRent || rentInfo[0]),
        periodStart: new Date(rentInfo.periodStart?.toNumber() * 1000 || rentInfo[1].toNumber() * 1000),
        periodEnd: new Date(rentInfo.periodEnd?.toNumber() * 1000 || rentInfo[2].toNumber() * 1000),
        lastClaim: new Date(rentInfo.lastClaim?.toNumber() * 1000 || rentInfo[3].toNumber() * 1000)
      };
    } catch (error) {
      console.error("Error getting accrued rent:", error);
      throw error;
    }
  };

  const getRentPeriodInfo = async (propertyId) => {
    try {
        const data = await contract.call('getRentPeriodStatus', [propertyId]);
        return {
            periodStart: new Date(data.periodStart.toNumber() * 1000),
            periodEnd: new Date(data.periodEnd.toNumber() * 1000),
            isActive: data.isActive,
            remainingTime: data.remainingTime.toNumber()
        };
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






