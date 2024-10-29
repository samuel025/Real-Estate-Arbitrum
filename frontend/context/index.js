import React, { createContext, useContext, useState } from "react";

import { 
    useAddress,
    useContract,
    useContractRead,
    useContractWrite,
    useWriteContract,
    useMetamask,
    useContractEvents,
    useSigner,
    useDisconnect,
    AddressSchema
} from "@thirdweb-dev/react";

import { ethers } from "ethers";


const AppContext = createContext();

export const UseAppContext = ({children}) => {
  const {contract} = useContract("0xFb6fcabef850d5680603b6529da8B532f204Ae16")

  const address = useAddress();
  const connect = useMetamask()
  const disconnect = useDisconnect();
  const signer = useSigner();

  const [userBalance, setUserBalance] = useState("");

  // -------------------------------------

  const {mutateAsync: listProperty} = useContractWrite(contract, "listProperty");
  const listPropertyFunction = async (formData) => {
    const {name, price, totalShares, rent, rentPeriod, images} = formData;
    try {
      const data = await listProperty({
        args: [address, name, price, totalShares, rent, rentPeriod, images]
      })
      console.info("Contract called successfully", data);
    } catch (error) {
      console.log("Error calling contract", error);
    }
  }

  // -------------------------------------

  const getPropertiesFunction = async () => {
    try {
        const properties = await contract.call('getAllProperties');
        const balance = await signer?.getBalance();
        const userBalance = address ? ethers.utils.formatEther(balance.toString()) : ""
        setUserBalance(userBalance);


        const parsedProperties = properties.map((property, index) => ({
            owner: property.owner,
            title: property.name,
            description: property.description,
            price: ethers.utils.formatEther(property.price.toString()),
            rent: property.rent,
            rentPeriod: property.rentPeriod,
            image: property.images,
            propertyAddress: property.propertyAddress
        }))
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
      args: [propertyId, shares],
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

  const {mutateAsync: payRent} = useContractWrite(contract, "payRent");
  const payRentFunction = async (formData) => {
    const {propertyId, amount, payer} = formData;
    try {
      const data = await payRent({
        args: [propertyId, payer],
        overrides: {
          value: ethers.utils.parseEther(amount)
        }
      });
      console.info("contract call success", data);
    } catch (error) {
      console.error("contract call failure", error);
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
        const properties = await contract.call('getProperty', propertyId);
        const balance = await signer?.getBalance();
        const userBalance = address ? ethers.utils.formatEther(balance.toString()) : ""
        setUserBalance(userBalance);


        const parsedProperties = properties.map((property, index) => ({
            owner: property.owner,
            title: property.name,
            description: property.description,
            price: ethers.utils.formatEther(property.price.toString()),
            rent: property.rent,
            rentPeriod: property.rentPeriod,
            image: property.images,
            shares: property.totalShares,
            AvailableShares: property.AvailableShares,
            propertyAddress: property.propertyAddress
        }))
        return parsedProperties;
    } catch (err) {
        console.error("contract call failure: ", err);
    }
  }

  //--------------------------------------------------------------

  const getShareholderInfoFunction = async (propertyId) => {
    try {
      const shareholdersinfo = await contract.call('getShareholderInfo', [propertyId, address])
      const info = shareholdersinfo.map((property, index) => ({
        shares: info.shares,
        rentClaimed: info.rentClaimed,
        UnclaimedRent: info.unclaimedRent
      }))
      return info
    } catch {
      console.error("Unable to fetch data")

    }
  }

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
      const shareholderproperties = await contract.call('getShareholderProperties', [address])
      return shareholderproperties
    } catch (error) {
      console.error("Couldn't fetch data")
    }
  }


  //------------------------------------------------------------

  const getOwnerPropertiesFunction = async () => {
    try {
      const ownerProperties = await contract.call('getOwnerProperties', address)
      return ownerProperties
    } catch (error) {
      console.error("Couldnt fetch data")
    }
  }

  return (
    <AppContext.Provider value={{
        address,
        disconnect,
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

    }}>
        {children}
    </AppContext.Provider>
  );
};






