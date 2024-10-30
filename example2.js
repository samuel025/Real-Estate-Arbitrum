"use client"
import { useEffect, useState } from "react";
import { useStateContext } from "../context"
import { getTopCreators } from "../utils";
import Link from 'next/link';
import styles from './styles/Home.module.css';

export default function Home() {
    const {
        address,
        connect,
        disconnect,
        userBalance,
        contract,
        getPropertiesData,
        totalPropertiesFunction,
        totalReviewsFunction,
        getHighestRatedProductFunction
    } = useStateContext();

    const [properties, setProperties] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [totalProperties, setTotalProperties] = useState(0);
    const [totalReviews, setTotalReviews] = useState(0);
    const [highestRatedProperty, setHighestRatedProperty] = useState(null);

    const fetchProperties = async () => {
        setIsLoading(true);
        const data = await getPropertiesData();
        setProperties(data);
        const total = await totalPropertiesFunction();
        setTotalProperties(total);
        const reviews = await totalReviewsFunction();
        setTotalReviews(reviews);
        const highestRated = await getHighestRatedProductFunction();
        setHighestRatedProperty(highestRated);
        setIsLoading(false);
    }

    useEffect(() => {
        if(contract) fetchProperties();
    }, [contract, address]);

    const categories = ["Housing", "Rental", "Farmhouse", "Office", "Commercial", "Country"];
    const categorizedProperties = categories.reduce((acc, category) => {
        acc[category] = properties.filter(property => property.category === category);
        return acc;
    }, {});

    const calculateCategoryWorth = (category) => {
        return categorizedProperties[category].reduce((total, property) => total + Number(property.price), 0).toFixed(2);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Real Estate Marketplace</h1>
                {address ? (
                    <button className={styles.button} onClick={disconnect}>Disconnect</button>
                ) : (
                    <button className={styles.button} onClick={connect}>Connect</button>
                )}
            </header>

            {address && (
                <div className={styles.userInfo}>
                    <h2>Welcome, {address.slice(0, 6)}...{address.slice(-4)}</h2>
                    <p>Your Balance: {userBalance?.slice(0, 6)} POL</p>
                </div>
            )}

            <div>
                <h2>Market Overview</h2>
                <p>Total Properties: {totalProperties}</p>
                <p>Total Reviews: {totalReviews}</p>
                {highestRatedProperty && (
                    <p>Highest Rated Property: {highestRatedProperty.title} ({highestRatedProperty.rating}/5)</p>
                )}
            </div>

            {address && (
                <div>
                    <h2>Property Categories</h2>
                    {isLoading ? (
                        <p className={styles.loading}>Loading categories...</p>
                    ) : (
                        <div className={styles.categories}>
                            {categories.map(category => (
                                <div key={category} className={styles.categoryItem}>
                                    <h3>{category}</h3>
                                    <p>{categorizedProperties[category].length} properties</p>
                                    <p>Worth: {calculateCategoryWorth(category)} POL</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {address && (
                <div>
                    <h2>Properties</h2>
                    {isLoading ? (
                        <p className={styles.loading}>Loading properties...</p>
                    ) : (
                        <div className={styles.propertyGrid}>
                            {properties.map((property, index) => (
                                <Link href={`/property/${property.productID}`} key={index}>
                                    <div className={styles.propertyCard}>
                                        <img src={property.image} alt={property.title} className={styles.propertyImage} />
                                        <div className={styles.propertyInfo}>
                                            <h3 className={styles.propertyTitle}>{property.title}</h3>
                                            <p className={styles.propertyPrice}>{property.price} POL</p>
                                            <p className={styles.propertyCategory}>{property.category}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>  
    )
}
