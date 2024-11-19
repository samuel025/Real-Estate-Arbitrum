"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '../../context';
import { ethers } from 'ethers';
import styles from './MyPropertyList.module.css';
import Navbar from '../../components/Navbar';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function MyPropertyList() {
    const { address, getOwnerPropertiesFunction, connect } = useAppContext();
    const [properties, setProperties] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProperties = async () => {
            if (address) {
                setIsLoading(true);
                setError(''); 

                try {
                    const fetchedProperties = await getOwnerPropertiesFunction();
                    if (fetchedProperties) {
                        setProperties(fetchedProperties);
                    } else {
                        setProperties([]);
                    }
                } catch (err) {
                    console.error("Error fetching properties:", err);
                    setError('Failed to load properties');
                } finally {
                    setIsLoading(false); 
                }
            } else {
                setProperties([]);
                setIsLoading(false);
            }
        };

        fetchProperties();
    }, [address, getOwnerPropertiesFunction]);

    if (!address) {
        return (
            <>
                <Navbar />
                <div className={styles.connectWalletContainer}>
                    <h1>My Properties</h1>
                    <p>Please connect your wallet to view your properties</p>
                    <button 
                        onClick={connect}
                        className={styles.connectButton}
                    >
                        Connect Wallet
                    </button>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1>My Properties</h1>
                    <Link href="/listproperty" className={styles.listPropertyButton}>
                        List New Property
                    </Link>
                </div>

                {isLoading ? (
                    <div className={styles.loadingContainer}>
                        <LoadingSpinner />
                    </div>
                ) : (
                    <>
                        {properties && properties.length > 0 ? (
                            <div className={styles.propertiesGrid}>
                                {properties.map((property) => (
                                    <div key={property.propertyId} className={styles.propertyCard}>
                                        <div className={styles.propertyImageContainer}>
                                            <img 
                                                src={property.image || property.images} 
                                                alt={property.title || property.name}
                                                className={styles.propertyImage}
                                            />
                                        </div>
                                        <div className={styles.propertyInfo}>
                                            <h3>{property.title || property.name}</h3>
                                            <div className={styles.propertyDetails}>
                                                <div className={styles.detailItem}>
                                                    <span className={styles.label}>Price:</span>
                                                    <span className={styles.value}>
                                                        {ethers.utils.formatEther(property.price)} ETH
                                                    </span>
                                                </div>
                                                <div className={styles.detailItem}>
                                                    <span className={styles.label}>Monthly Rent:</span>
                                                    <span className={styles.value}>
                                                        {ethers.utils.formatEther(property.rent)} ETH
                                                    </span>
                                                </div>
                                                <div className={styles.detailItem}>
                                                    <span className={styles.label}>Location:</span>
                                                    <span className={styles.value}>
                                                        {property.propertyAddress}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={styles.cardActions}>
                                                <Link 
                                                    href={`/property/${property.propertyId}`}
                                                    className={styles.viewButton}
                                                >
                                                    View Details
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            !error && (
                                <div className={styles.noProperties}>
                                    <p>You haven't listed any properties yet.</p>
                                    <Link href="/listproperty" className={styles.listPropertyButton}>
                                        List Your First Property
                                    </Link>
                                </div>
                            )
                        )}
                    </>
                )}
            </div>
        </>
    );
}
