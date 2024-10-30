"use client"

import styles from "./page.module.css";
import { useAppContext } from '../context';
import { useEffect, useState } from "react";
import Link from 'next/link';
import { ethers } from 'ethers';
import Navbar from '../components/Navbar';

export default function Home() {
  const { 
    address,
    contract,
    buySharesFunction,
    getPropertiesFunction,
  } = useAppContext();

  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProperties = async () => {
    setIsLoading(true);
    const data = await getPropertiesFunction();
    setProperties(data);
    setIsLoading(false);
  }

  useEffect(() => {
    if(contract) fetchProperties();
  }, [contract]);

  return (
    <>
      <Navbar />
      <main className={styles.container}>
        <h1>Available Properties</h1>
        
        {isLoading ? (
          <p className={styles.loadingText}>Loading properties...</p>
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
