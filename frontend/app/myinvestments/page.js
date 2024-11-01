'use client';

import { useEffect, useState } from 'react';
import { useAppContext } from '@/context';
import styles from './myinvestments.module.css';
import Link from 'next/link';
import { ethers } from 'ethers';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function MyInvestments() {
  const [properties, setProperties] = useState(null);
  const [loading, setLoading] = useState(true);
  const { getShareholderPropertiesFunction } = useAppContext();

  useEffect(() => {
    let mounted = true;

    const fetchProperties = async () => {
      try {
        setLoading(true);
        const shareholderProperties = await getShareholderPropertiesFunction();
        
        if (mounted) {
          setProperties(shareholderProperties || []);
        }
      } catch (error) {
        console.error('Error fetching properties:', error);
        if (mounted) {
          setProperties([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchProperties();

    return () => {
      mounted = false;
    };
  }, [getShareholderPropertiesFunction]);

  if (loading && properties === null) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <LoadingSpinner />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>My Property Investments</h1>
        </div>

        {(!properties || properties.length === 0) ? (
          <div className={styles.noProperties}>
            <p>You don't have any property investments yet.</p>
          </div>
        ) : (
          <div className={styles.propertiesGrid}>
            {properties.map((property) => (
              <Link href={`/property/${property.propertyId}`} key={property.propertyId}>
                <div className={styles.propertyCard}>
                  <img
                    src={property.image || '/placeholder-property.jpg'}
                    alt={property.title}
                    className={styles.propertyImage}
                  />
                  <h2 className={styles.propertyTitle}>{property.title}</h2>
                  <div className={styles.propertyDetails}>
                    <p>{property.propertyAddress}</p>
                    <p>{property.description}</p>
                  </div>
                  <div className={styles.shareInfo}>
                    <span>Price: {ethers.utils.formatEther(property.price)} ETH</span>
                    <span>Rent: {ethers.utils.formatEther(property.rent)} ETH</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
