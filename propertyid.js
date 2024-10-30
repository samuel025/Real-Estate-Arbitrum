"use client"
import { useEffect, useState } from "react";
import { useStateContext } from "../../../context";
import { useParams } from "next/navigation";
import styles from '../../styles/PropertyDetail.module.css';
import { ethers } from 'ethers';

export default function PropertyDetail() {
    const { contract, getPropertyFunction, buyPropertyFunction, addReviewFunction, updatePriceFunction } = useStateContext();
    const [property, setProperty] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
    const [showUpdatePrice, setShowUpdatePrice] = useState(false);
    const [newPrice, setNewPrice] = useState('');
    const { id } = useParams();

    useEffect(() => {
        const fetchProperty = async () => {
            if (contract && id) {
                setIsLoading(true);
                const propertyData = await getPropertyFunction(id);
                setProperty(propertyData);
                setIsLoading(false);
            }
        };

        fetchProperty();
    }, [contract, id]);

    const handleBuy = async () => {
        if (property) {
            await buyPropertyFunction({ productID: property.productID, amount: property.price });
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (property) {
            await addReviewFunction({
                productID: property.productID,
                rating: reviewForm.rating,
                comment: reviewForm.comment
            });
            // Optionally, refresh the property data here to show the new review
        }
    };

    const handleUpdatePrice = async (e) => {
        e.preventDefault();
        if (property && newPrice) {
            try {
                // Convert the newPrice to wei
                const priceInWei = ethers.utils.parseEther(newPrice);
                
                // Create the form object expected by updatePriceFunction
                const updatePriceForm = {
                    productID: property.productID,
                    price: priceInWei.toString() // Convert BigNumber to string
                };

                await updatePriceFunction(updatePriceForm);
                setShowUpdatePrice(false);
                
                // Refresh property data immediately
                const updatedProperty = await getPropertyFunction(id);
                setProperty(updatedProperty);
                
                // Clear the newPrice input
                setNewPrice('');
                
                // Optionally, you can add a success message here
                console.log("Price updated successfully!");
            } catch (error) {
                console.error("Error updating price:", error);
                // Handle the error (e.g., show an error message to the user)
            }
        }
    };

    if (isLoading) {
        return <div className={styles.loading}>Loading property details...</div>;
    }

    if (!property) {
        return <div className={styles.error}>Property not found</div>;
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>{property.title}</h1>
            <img src={property.images} alt={property.title} className={styles.image} />
            <div className={styles.details}>
                <p className={styles.price}>Price: {property.price} POL</p>
                <p className={styles.category}>Category: {property.category}</p>
                <p className={styles.description}>Description: {property.description}</p>
                <p className={styles.owner}>Owner: {property.owner}</p>
                <p className={styles.address}>Address: {property.address}</p>
            </div>
            <button onClick={handleBuy} className={styles.buyButton}>Buy Property</button>
            
            <button onClick={() => setShowUpdatePrice(true)} className={styles.updatePriceButton}>Update Price</button>
            
            {showUpdatePrice && (
                <div className={styles.popup}>
                    <form onSubmit={handleUpdatePrice} className={styles.updatePriceForm}>
                        <input
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            placeholder="Enter new price in ETH"
                            className={styles.priceInput}
                        />
                        <button type="submit" className={styles.submitPrice}>Update</button>
                        <button type="button" onClick={() => setShowUpdatePrice(false)} className={styles.closePopup}>Cancel</button>
                    </form>
                </div>
            )}

            <div className={styles.reviewSection}>
                <h2>Add a Review</h2>
                <form onSubmit={handleReviewSubmit} className={styles.reviewForm}>
                    <select 
                        value={reviewForm.rating} 
                        onChange={(e) => setReviewForm({...reviewForm, rating: e.target.value})}
                        className={styles.ratingSelect}
                    >
                        {[1,2,3,4,5].map(num => (
                            <option key={num} value={num}>{num} Star{num !== 1 ? 's' : ''}</option>
                        ))}
                    </select>
                    <textarea 
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
                        placeholder="Write your review here..."
                        className={styles.reviewTextarea}
                    />
                    <button type="submit" className={styles.submitReview}>Submit Review</button>
                </form>
            </div>
        </div>
    );
}
