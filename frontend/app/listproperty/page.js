"use client"

import { useState } from 'react';
import { useAppContext } from '../../context';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import styles from './ListProperty.module.css';
import Navbar from '../../components/Navbar';

export default function ListProperty() {
    const { address, listPropertyFunction, connect } = useAppContext();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        price: '',
        totalShares: '',
        rent: '',
        rentPeriod: '30',
        images: '',
        description: '',
        propertyAddress: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (!address) {
                throw new Error("Please connect your wallet first");
            }

            const priceInWei = ethers.utils.parseEther(formData.price.toString());
            const rentInWei = ethers.utils.parseEther(formData.rent.toString());
            const totalSharesBN = ethers.BigNumber.from(formData.totalShares.toString());
            const rentPeriodBN = ethers.BigNumber.from(formData.rentPeriod.toString());

            if (!formData.name || !formData.price || !formData.totalShares || 
                !formData.rent || !formData.images || !formData.description || 
                !formData.propertyAddress) {
                throw new Error("All fields are required");
            }

            if (formData.price <= 0 || formData.rent <= 0 || 
                formData.totalShares <= 0 || formData.rentPeriod <= 0) {
                throw new Error("Numeric values must be greater than 0");
            }

            await listPropertyFunction(
                address,
                formData.name,
                priceInWei,
                totalSharesBN,
                rentInWei,
                rentPeriodBN,
                formData.images,
                formData.description,
                formData.propertyAddress
            );

            router.push('/');
        } catch (err) {
            console.error("Error listing property:", err);
            setError(err.message || "Failed to list property");
        } finally {
            setIsLoading(false);
        }
    };

    if (!address) {
        return (
            <>
                <Navbar />
                <div className={styles.connectWalletContainer}>
                    <h1>List a New Property</h1>
                    <p>Please connect your wallet to list a property</p>
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
                    <h1>List a New Property</h1>
                </div>
                
                {error && <div className={styles.error}>{error}</div>}
                
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="name">Property Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter property name"
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="price">Price (ETH)</label>
                        <input
                            type="number"
                            id="price"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            placeholder="Enter price in ETH"
                            step="0.001"
                            min="0"
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="totalShares">Total Shares</label>
                        <input
                            type="number"
                            id="totalShares"
                            name="totalShares"
                            value={formData.totalShares}
                            onChange={handleChange}
                            placeholder="Enter total shares"
                            min="1"
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="rent">Monthly Rent (ETH)</label>
                        <input
                            type="number"
                            id="rent"
                            name="rent"
                            value={formData.rent}
                            onChange={handleChange}
                            placeholder="Enter rent in ETH"
                            step="0.001"
                            min="0"
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="rentPeriod">Rent Period (days)</label>
                        <input
                            type="number"
                            id="rentPeriod"
                            name="rentPeriod"
                            value={formData.rentPeriod}
                            onChange={handleChange}
                            placeholder="Enter rent period in days"
                            min="1"
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="images">Image URL</label>
                        <input
                            type="url"
                            id="images"
                            name="images"
                            value={formData.images}
                            onChange={handleChange}
                            placeholder="Enter image URL"
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Enter property description"
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="propertyAddress">Property Address</label>
                        <input
                            type="text"
                            id="propertyAddress"
                            name="propertyAddress"
                            value={formData.propertyAddress}
                            onChange={handleChange}
                            placeholder="Enter property address"
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        className={styles.submitButton}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Listing Property...' : 'List Property'}
                    </button>
                </form>
            </div>
        </>
    );
}