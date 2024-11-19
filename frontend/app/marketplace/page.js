'use client'
import { useState, useEffect } from 'react';
import { useAppContext } from '@/context';
import styles from './Marketplace.module.css';
import { ethers } from 'ethers';
import Navbar from '@/components/Navbar';
import Image from 'next/image';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Marketplace() {
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [priceFilter, setPriceFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('newest');
    const [sharesToBuy, setSharesToBuy] = useState({});
    const [buyErrors, setBuyErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    const [isBuyingBack, setIsBuyingBack] = useState({});
    const [isCancelling, setIsCancelling] = useState({});

    const { 
        getActiveListingsFunction, 
        buyListedSharesFunction, 
        getPropertyFunction, 
        address,
        contract,
        cancelListingFunction
    } = useAppContext();

    const fetchListings = async () => {
        try {
            setLoading(true);
            setError(null);
            
            if (!contract) {
                return;
            }

            const activeListings = await getActiveListingsFunction();

            if (!activeListings || activeListings.length === 0) {
                setListings([]);
                return;
            }
            const listingsWithDetails = await Promise.all(
                activeListings.map(async (listing) => {
                    try {
                        const propertyDetails = await getPropertyFunction(listing.propertyId);
                        if (!propertyDetails) {
                            return null;
                        }

                        return {
                            ...listing,
                            property: propertyDetails[0] 
                        };
                    } catch (err) {
                        console.error(`Error fetching property ${listing.propertyId}:`, err);
                        return null;
                    }
                })
            );

            const validListings = listingsWithDetails.filter(listing => listing !== null);
            setListings(validListings);
        } catch (err) {
            console.error("Error fetching listings:", err);
            setError("Failed to load listings. Please try again.");
            setListings([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (contract) {
            fetchListings();
        }
    }, [contract]);

    useEffect(() => {
    }, [listings]);

    const handleBuyShares = async (listingId, pricePerShare) => {
        try {
            if (!address) {
                setBuyErrors(prev => ({
                    ...prev,
                    [listingId]: "Please connect your wallet first"
                }));
                return;
            }

            const listing = listings.find(l => l.listingId === listingId.toString());
            if (!listing) {
                throw new Error("Listing not found");
            }

            const sharesToBuyAmount = sharesToBuy[listingId];
            if (!sharesToBuyAmount || sharesToBuyAmount <= 0) {
                setBuyErrors(prev => ({
                    ...prev,
                    [listingId]: "Please enter a valid number of shares"
                }));
                return;
            }

            // Calculate total cost without platform fee
            const pricePerShareBN = ethers.BigNumber.from(listing.pricePerShare);
            const totalCostBN = pricePerShareBN.mul(sharesToBuyAmount);

            setIsBuyingBack(prev => ({ ...prev, [listingId]: true }));

            await buyListedSharesFunction(
                listingId,
                sharesToBuyAmount
            );

            setSharesToBuy(prev => ({ ...prev, [listingId]: '' }));
            setBuyErrors(prev => ({ ...prev, [listingId]: '' }));
            setSuccessMessage("Shares purchased successfully!");

            await fetchListings();

        } catch (err) {
            console.error("Error buying shares:", err);
            let errorMessage = "Failed to buy shares";

            if (err.message.includes("InvalidAmount")) {
                errorMessage = "Invalid transaction amount. Please try again.";
            } else if (err.message.includes("insufficient funds")) {
                errorMessage = "Insufficient funds in your wallet";
            } else if (err.code === 4001) {
                errorMessage = "Transaction rejected by user";
            }

            setBuyErrors(prev => ({
                ...prev,
                [listingId]: errorMessage
            }));
        } finally {
            setIsBuyingBack(prev => ({ ...prev, [listingId]: false }));
        }
    };

    const handleCancelListing = async (listingId) => {
        try {
            setError(null);
            setIsCancelling(prev => ({ ...prev, [listingId]: true }));
            
            await cancelListingFunction(listingId);
            
            await fetchListings();
            
            setSuccessMessage("Listing cancelled successfully");
            
            setTimeout(() => {
                setSuccessMessage("");
            }, 3000);
            
        } catch (err) {
            console.error("Error cancelling listing:", err);
            setError("Failed to cancel listing. Please try again.");
        } finally {
            setIsCancelling(prev => ({ ...prev, [listingId]: false }));
        }
    };

    const filteredAndSortedListings = listings
        .filter(listing => {
            const propertyAddress = listing.seller?.toLowerCase() || '';
            const propertyName = listing.property?.name?.toLowerCase() || '';
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = propertyAddress.includes(searchLower) || 
                                propertyName.includes(searchLower);


            let matchesPrice = true;
            const price = ethers.BigNumber.isBigNumber(listing.pricePerShare)
                ? Number(ethers.utils.formatEther(listing.pricePerShare))
                : Number(listing.pricePerShare);

            if (priceFilter === 'low') {
                matchesPrice = price < 0.1;
            } else if (priceFilter === 'medium') {
                matchesPrice = price >= 0.1 && price < 0.5;
            } else if (priceFilter === 'high') {
                matchesPrice = price >= 0.5;
            }

            return matchesSearch && matchesPrice;
        })
        .sort((a, b) => {
            const getPrice = (listing) => {
                return ethers.BigNumber.isBigNumber(listing.pricePerShare)
                    ? Number(ethers.utils.formatEther(listing.pricePerShare))
                    : Number(listing.pricePerShare);
            };

            if (sortOrder === 'newest') {
                return Number(b.listingTime || 0) - Number(a.listingTime || 0);
            } else if (sortOrder === 'oldest') {
                return Number(a.listingTime || 0) - Number(b.listingTime || 0);
            } else if (sortOrder === 'priceAsc') {
                return getPrice(a) - getPrice(b);
            } else {
                return getPrice(b) - getPrice(a);
            }
        });

    const formatPrice = (priceInWei) => {
        try {
            return Number(ethers.utils.formatEther(priceInWei)).toFixed(6);
        } catch (error) {
            console.error("Error formatting price:", error);
            return "0";
        }
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <div className={styles.filters}>
                    <input
                        type="text"
                        placeholder="Search by address or property name..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setBuyErrors({}); 
                        }}
                        className={styles.searchInput}
                    />
                    <select
                        value={priceFilter}
                        onChange={(e) => setPriceFilter(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="all">All Prices</option>
                        <option value="low">Low (&lt;0.1 ETH)</option>
                        <option value="medium">Medium (0.1-0.5 ETH)</option>
                        <option value="high">High (&gt;0.5 ETH)</option>
                    </select>
                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="priceAsc">Price: Low to High</option>
                        <option value="priceDesc">Price: High to Low</option>
                    </select>
                </div>

                {loading && (
                    <div className={styles.loadingSpinner}>
                        Loading listings...
                    </div>
                )}

                {error && (
                    <div className={styles.error}>
                        {error}
                    </div>
                )}

                {!loading && !error && filteredAndSortedListings.length === 0 && (
                    <div className={styles.emptyState}>
                        No listings found
                    </div>
                )}

                <div className={styles.listingsGrid}>
                    {filteredAndSortedListings.map((listing, index) => {                    
                        const numberOfShares = listing.numberOfShares.toString();
                        const priceInEth = ethers.utils.formatEther(listing.pricePerShare);
                        const totalPrice = (Number(numberOfShares) * Number(priceInEth)).toFixed(6);

                        return (
                            <div key={index} className={styles.listingCard}>
                                <div className={styles.listingHeader}>
                                    <div>
                                        <h2>Property ID: {listing.propertyId?.toString()}</h2>
                                        {listing.property && (
                                            <h3 className={styles.propertyName}>
                                                {listing.property.name || 'Unnamed Property'}
                                            </h3>
                                        )}
                                    </div>
                                </div>
                                
                                <div className={styles.listingDetails}>
                                    {listing.property && (
                                        <div className={styles.propertyInfo}>
                                            {listing.property.images ? (
                                                <div style={{ position: 'relative', width: '100%', height: '200px' }}>
                                                    <Image 
                                                        src={listing.property.images}
                                                        alt={listing.property.name || 'Property Image'}
                                                        fill
                                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                        style={{ objectFit: 'cover' }}
                                                        priority
                                                    />
                                                </div>
                                            ) : (
                                                <div className={styles.noImage}>No Image Available</div>
                                            )}
                                            <p className={styles.propertyAddress}>
                                                {listing.property.propertyAddress || 'Address not available'}
                                            </p>
                                        </div>
                                    )}
                                    
                                    <div className={styles.detail}>
                                        <span>Available Shares:</span>
                                        <span>{numberOfShares}</span>
                                    </div>

                                    <div className={styles.detail}>
                                        <span>Price per Share:</span>
                                        <span>{Number(priceInEth).toFixed(6)} ETH</span>
                                    </div>

                                    <div className={styles.detail}>
                                        <span>Total Price:</span>
                                        <span>{totalPrice} ETH</span>
                                    </div>

                                    <div className={styles.detail}>
                                        <span>Seller:</span>
                                        <span className={styles.address}>
                                            {listing.seller 
                                                ? `${listing.seller.slice(0, 6)}...${listing.seller.slice(-4)}`
                                                : 'Unknown'
                                            }
                                        </span>
                                    </div>
                                </div>

                                {address && (
                                    <div className={styles.buySection}>
                                        {listing.seller.toLowerCase() === address.toLowerCase() ? (
                                            <div className={styles.sellerActions}>
                                                <div className={styles.ownerNotice}>
                                                    This is your listing
                                                </div>
                                                <button 
                                                    className={styles.cancelButton}
                                                    onClick={() => handleCancelListing(listing.listingId)}
                                                    disabled={isCancelling[listing.listingId]}
                                                >
                                                    {isCancelling[listing.listingId] ? (
                                                        <div className={styles.loadingButton}>
                                                            <LoadingSpinner />
                                                            <span>Cancelling...</span>
                                                        </div>
                                                    ) : (
                                                        'Cancel Listing'
                                                    )}
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className={styles.shareInput}>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max={listing.numberOfShares}
                                                        value={sharesToBuy[listing.listingId] || ''}
                                                        onChange={(e) => {
                                                            const value = parseInt(e.target.value);
                                                            const maxShares = parseInt(listing.numberOfShares);
                                                            
                                                            if (!value) {
                                                                setSharesToBuy(prev => ({
                                                                    ...prev,
                                                                    [listing.listingId]: ''
                                                                }));
                                                                return;
                                                            }

                                                            const validValue = Math.min(value, maxShares);
                                                            
                                                            setSharesToBuy(prev => ({
                                                                ...prev,
                                                                [listing.listingId]: validValue
                                                            }));
                                                            
                                                            setBuyErrors(prev => ({
                                                                ...prev,
                                                                [listing.listingId]: ''
                                                            }));
                                                        }}
                                                        placeholder={`1-${listing.numberOfShares} shares`}
                                                        className={styles.sharesInput}
                                                    />
                                                    {buyErrors[listing.listingId] && (
                                                        <div className={styles.error}>
                                                            {buyErrors[listing.listingId]}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={styles.totalCost}>
                                                    Total Cost: {sharesToBuy[listing.listingId] 
                                                        ? formatPrice(
                                                            ethers.BigNumber.from(listing.pricePerShare)
                                                                .mul(ethers.BigNumber.from(sharesToBuy[listing.listingId]))
                                                          )
                                                        : '0'} ETH
                                                </div>
                                                <button
                                                    className={`${styles.buyButton} ${
                                                        listing.property?.owner.toLowerCase() === address.toLowerCase() 
                                                            ? styles.buybackButton 
                                                            : ''
                                                    }`}
                                                    onClick={() => handleBuyShares(
                                                        listing.listingId,
                                                        listing.numberOfShares,
                                                        listing.pricePerShare
                                                    )}
                                                    disabled={
                                                        !listing.isActive || 
                                                        !sharesToBuy[listing.listingId] || 
                                                        isBuyingBack[listing.listingId]
                                                    }
                                                >
                                                    {isBuyingBack[listing.listingId] 
                                                        ? <div className={styles.loadingButton}>
                                                            <LoadingSpinner />
                                                            <span>Processing...</span>
                                                          </div>
                                                        : listing.property?.owner.toLowerCase() === address.toLowerCase()
                                                            ? 'Buy Back Shares'
                                                            : 'Buy Shares'
                                                    }
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            {successMessage && (
                <div className={styles.successMessage}>
                    {successMessage}
                </div>
            )}
        </>
    );
} 