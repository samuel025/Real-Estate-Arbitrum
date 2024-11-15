"use client"

import styles from "./page.module.css";
import { useAppContext } from '../context';
import { useEffect, useState } from "react";
import Link from 'next/link';
import { ethers } from 'ethers';
import Navbar from '../components/Navbar';
import LoadingSpinner from "@/components/LoadingSpinner";

export default function Home() {
  const { 
    contract,
    getPropertiesFunction,
  } = useAppContext();

  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProperties = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getPropertiesFunction();
      setProperties(data || []);
    } catch (err) {
      console.error("Error fetching properties:", err);
      setError("Failed to load properties");
      setProperties([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (contract) {
      fetchProperties();
    } else {
      setIsLoading(false);
    }
  }, [contract]);

  return (
    <>
      <Navbar />
      <main className={styles.container}>
        <h1>Available Properties</h1>
        
        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}
        
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <LoadingSpinner />
          </div>
        ) : (
          <div className={styles.propertiesGrid}>
            {properties?.map((property) => (
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
                    {ethers.utils.formatEther(property.price)} ETH
                  </p>
                  <p className={styles.propertyDescription}>
                    {property.description}
                  </p>
                  <p>Rent: {ethers.utils.formatEther(property.rent)} ETH</p>
                  <button 
                    className={styles.buyButton}
                  >
                    Buy Shares
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
