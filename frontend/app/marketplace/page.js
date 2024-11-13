'use client'
import { useState, useEffect } from 'react';
import { useAppContext } from '@/context';
import styles from './Marketplace.module.css';
import { ethers } from 'ethers';
import Navbar from '@/components/Navbar';

export default function Marketplace() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [propertyDetails, setPropertyDetails] = useState({});
  const [sharesToBuy, setSharesToBuy] = useState({});

  const { 
    getActiveListingsFunction, 
    buyListedSharesFunction, 
    getPropertyFunction, 
    address 
  } = useAppContext();

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      // Get all active listings using the new function
      const activeListings = await getActiveListingsFunction();
      
      // Get unique property IDs
      const uniquePropertyIds = [...new Set(activeListings.map(listing => listing.propertyId))];
      
      // Fetch property details for each unique property ID
      const propertyDetailsMap = {};
      for (const propertyId of uniquePropertyIds) {
        try {
          const details = await getPropertyFunction(propertyId);
          propertyDetailsMap[propertyId] = details;
        } catch (err) {
          console.error(`Failed to fetch details for property ${propertyId}:`, err);
        }
      }

      setPropertyDetails(propertyDetailsMap);
      setListings(activeListings);
      
      // Initialize sharesToBuy state for each listing
      const initialSharesToBuy = {};
      activeListings.forEach((listing, index) => {
        initialSharesToBuy[index] = listing.numberOfShares;
      });
      setSharesToBuy(initialSharesToBuy);

    } catch (err) {
      setError('Failed to fetch listings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyShares = async (listingId, shares, pricePerShare) => {
    try {
      const sharesToPurchase = sharesToBuy[listingId];
      if (!sharesToPurchase || sharesToPurchase <= 0) {
        throw new Error('Invalid number of shares');
      }
      
      await buyListedSharesFunction(
        listingId,
        sharesToPurchase,
        pricePerShare
      );
      
      // Refresh listings after purchase
      await fetchListings();
    } catch (err) {
      console.error('Failed to buy shares:', err);
      setError('Failed to buy shares. Please try again.');
    }
  };

  const handleSharesInputChange = (listingId, value) => {
    const shares = parseInt(value);
    const listing = listings[listingId];
    
    if (shares && shares > 0 && shares <= listing.numberOfShares) {
      setSharesToBuy(prev => ({
        ...prev,
        [listingId]: shares
      }));
    }
  };

  if (loading) return <div className={styles.loading}>Loading listings...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <>
    <Navbar />
    <div className={styles.container}>
      <h1 className={styles.title}>Share Marketplace</h1>
      
      {listings.length === 0 ? (
        <div className={styles.noListings}>No shares currently listed for sale</div>
      ) : (
        <div className={styles.listingsGrid}>
          {listings.map((listing, index) => {
            const shares = sharesToBuy[index] || listing.numberOfShares;
            const totalPrice = (Number(listing.pricePerShare) * shares).toFixed(4);
            const property = propertyDetails[listing.propertyId];
            
            return (
              <div key={index} className={styles.listingCard}>
                <div className={styles.listingHeader}>
                  <div>
                    <h2>Property ID: {listing.propertyId}</h2>
                    {property && (
                      <h3 className={styles.propertyName}>{property.title}</h3>
                    )}
                  </div>
                  <span className={styles.date}>
                    Listed: {new Date(listing.listingTime).toLocaleDateString()}
                  </span>
                </div>
                
                <div className={styles.listingDetails}>
                  {property && (
                    <div className={styles.propertyInfo}>
                      <img 
                        src={property.image} 
                        alt={property.title}
                        className={styles.propertyImage}
                      />
                      <p className={styles.propertyAddress}>{property.propertyAddress}</p>
                    </div>
                  )}
                  <div className={styles.detail}>
                    <span>Available Shares:</span>
                    <span>{listing.numberOfShares}</span>
                  </div>
                  <div className={styles.detail}>
                    <span>Price per Share:</span>
                    <span>{listing.pricePerShare} ETH</span>
                  </div>
                  <div className={styles.detail}>
                    <span>Total Price:</span>
                    <span>{totalPrice} ETH</span>
                  </div>
                  <div className={styles.detail}>
                    <span>Seller:</span>
                    <span className={styles.address}>
                      {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                    </span>
                  </div>
                </div>

                {address && address !== listing.seller && (
                  <button
                    className={styles.buyButton}
                    onClick={() => handleBuyShares(index, shares, listing.pricePerShare)}
                  >
                    Buy Shares
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
    </>
  );
} 