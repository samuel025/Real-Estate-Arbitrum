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
  const {contract} = useContract("0x5a290E063fdd2af565283dd9942f1419496d5c9D")

  const address = useAddress();
  const connect = useMetamask()
  const disconnect = useDisconnect();
  const signer = useSigner();

  const [userBalance, setUserBalance] = useState("");
  useEffect(() => {
    const fetchBalance = async () => {
      if (signer) {
        try {
          const balance = await signer.getBalance();
          // Convert balance from wei to ETH and set it in state
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
                owner,          // _owner
                name,           // _name
                price,         // _price
                totalShares,   // _totalShares
                rent,          // _rent
                rentPeriod,    // _rentPeriod
                images,        // _images
                description,   // _description
                propertyAddress // _propertyAddress
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
        console.log("Raw properties from contract:", properties);

        const parsedProperties = properties.map((property) => ({
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

        console.log("Parsed properties:", parsedProperties);
        return parsedProperties;
    } catch (err) {
        console.error("contract call failure: ", err);
    }
  }

// --------------------------------------------

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
        value: ethers.utils.parseEther(price) // This should be in wei
      }
    });
    console.info("contract call success", data);
  } catch (error) {
    console.error("contract call failure", error);
  }
}

// --------------------------------------------

const {mutateAsync: sellShares} = useContractWrite(contract, "sellShares");
const sellSharesFunction = async (formData) => {
  const {propertyId, shares, seller} = formData;
  try {
    const data = await sellShares({
      args: [propertyId, shares, seller],
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
        value: ethers.utils.parseEther(amount) // Convert amount to wei
      }
    });
    console.info("contract call success", data);
  } catch (error) {
    console.error("contract call failure", error);
  }
}

// --------------------------------------------

const {mutateAsync: removeLiquidity} = useContractWrite(contract, "removeLiquidity");
const removeLiquidityFunction = async (amount) => {
  try {
    const data = await removeLiquidity({
      args: [amount]
    });
    console.info("contract call success", data);
  } catch (error) {
    console.error("contract call failure", error);
  }
}

// -------------------------------------------

  const getLiquidityBalanceFunction = async (providerAddress) => {
    try {
      const balance = await contract.call('getLiquidityBalance', providerAddress);
      return ethers.utils.formatEther(balance.toString()); // Convert balance from wei to ether
    } catch (error) {
      console.error("contract call failure", error);
      return null;
    }
  }

  //--------------------------------------------------------

  const {mutateAsync: payRent} = useContractWrite(contract, "payRent")

  const payRentFunction = async (formData) => {
    const {propertyId, rent} = formData;
    try {
      console.log("Starting rent payment:", {
        propertyId,
        address,
        rentAmount: rent.toString()
      });

      const data = await payRent({
        args: [propertyId, address],
        overrides: {
          value: rent,
          gasLimit: 500000 // Add explicit gas limit
        }
      });

      // Wait for transaction to be mined
      const receipt = await data.wait();
      console.log("Transaction receipt:", receipt);
      
      return receipt;
    } catch (error) {
      console.error("Detailed error:", error);
      if (error.reason) {
        throw new Error(error.reason);
      } else if (error.data?.message) {
        throw new Error(error.data.message);
      } else {
        throw new Error("Failed to pay rent. Please check if rent is due and you have enough ETH.");
      }
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


  const getSinglePropertyFunction = async (propertyId) => {
    try {
        console.log("Getting property with ID:", propertyId);
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

  //--------------------------------------------------------------

  const getShareholderInfoFunction = async (propertyId) => {
    try {
      const shareholderInfo = await contract.call('getShareholderInfo', [propertyId, address]);
      // Contract returns a tuple of (shares, rentClaimed, unclaimedRent)
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
      const reviewdata = await contract.call('getPropertyReviews', [propertyId])
      return reviewdata
    } catch {
      console.error("colud not fetch the data")
    }
  }

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
    sellSharesFunction,
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
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};






