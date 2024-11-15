"use client"

import styles from "./page.module.css";
import { useAppContext } from '../context';
import { useEffect, useState } from "react";
import Link from 'next/link';
import { ethers } from 'ethers';
import Navbar from '../components/Navbar';
import LoadingSpinner from "@/components/LoadingSpinner";
import { useContractRead } from "@thirdweb-dev/react";

export default function Home() {
  const { contract } = useAppContext();
  
  // Use useContractRead hook directly in the component
  const { data: properties, isLoading, error } = useContractRead(
    contract,
    "getAllProperties"
  );

  // Format ETH values without trailing zeros
  const formatEth = (value) => {
    try {
      const formattedValue = ethers.utils.formatEther(value);
      // Convert to number and back to string to remove trailing zeros
      const parsed = parseFloat(formattedValue);
      // If it's a whole number, don't show decimals
      if (parsed % 1 === 0) {
        return parsed.toString();
      }
      // Otherwise return the number with natural decimal places
      return parsed.toString();
    } catch (err) {
      console.error("Error formatting ETH value:", err);
      return "0";
    }
  };

  // Parse properties data
  const parsedProperties = properties?.map((property) => ({
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
  })) || [];

  return (
    <>
      <Navbar />
      <main className={styles.container}>
        <h1>Available Properties</h1>
        
        {error && (
          <div className={styles.error}>
            Failed to load properties
          </div>
        )}
        
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <LoadingSpinner />
          </div>
        ) : (
          <div className={styles.propertiesGrid}>
            {parsedProperties.length > 0 ? (
              parsedProperties.map((property) => (
                <Link 
                  href={`/property/${property.propertyId}`} 
                  key={property.propertyId}
                  className={styles.propertyCard}
                >
                  <img 
                    src={property.image} 
                    alt={property.title} 
                    className={styles.propertyImage} 
                  />
                  <div className={styles.propertyContent}>
                    <h3 className={styles.propertyTitle}>{property.title}</h3>
                    <p className={styles.propertyPrice}>
                      {formatEth(property.price)} ETH
                    </p>
                    <p className={styles.propertyDescription}>
                      {property.description}
                    </p>
                    <p>Rent: {formatEth(property.rent)} ETH</p>
                    <button 
                      className={styles.buyButton}
                    >
                      Buy Shares
                    </button>
                  </div>
                </Link>
              ))
            ) : (
              <div className={styles.noProperties}>
                No properties available
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
