'use client'
import { useState, useEffect } from 'react';
import { useAppContext } from '@/context';
import styles from './Marketplace.module.css';
import { ethers } from 'ethers';
import Navbar from '@/components/Navbar';
import Image from 'next/image';

export default function Marketplace() {
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [propertyDetails, setPropertyDetails] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [priceFilter, setPriceFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('newest');
    const [sharesToBuy, setSharesToBuy] = useState({});
    const [buyErrors, setBuyErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    const [isBuyingBack, setIsBuyingBack] = useState({});

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
                console.log("Waiting for contract initialization...");
                return;
            }

            // Get listings
            console.log("Calling getActiveListingsFunction...");
            const activeListings = await getActiveListingsFunction();
            console.log("Active listings:", activeListings);

            if (!activeListings || activeListings.length === 0) {
                console.log("No active listings found");
                setListings([]);
                return;
            }

            // Get property details for each listing
            const listingsWithDetails = await Promise.all(
                activeListings.map(async (listing) => {
                    try {
                        console.log("Getting property details for ID:", listing.propertyId);
                        const propertyDetails = await getPropertyFunction(listing.propertyId);
                        
                        if (!propertyDetails) {
                            console.log("No property details found for ID:", listing.propertyId);
                            return null;
                        }

                        return {
                            ...listing,
                            property: propertyDetails[0] // Note: getPropertyFunction returns an array
                        };
                    } catch (err) {
                        console.error(`Error fetching property ${listing.propertyId}:`, err);
                        return null;
                    }
                })
            );

            // Filter out null values
            const validListings = listingsWithDetails.filter(listing => listing !== null);
            console.log("Final listings with details:", validListings);

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
        console.log("Listings state updated:", listings);
    }, [listings]);

    const debugListing = async (listingId) => {
        try {
            const details = await contract.call('getListingDetails', [listingId]);
            console.log('Listing details:', {
                exists: details.exists,
                isActive: details.isActive,
                propertyId: details.propertyId.toString(),
                seller: details.seller,
                numberOfShares: details.numberOfShares.toString(),
                pricePerShare: details.pricePerShare.toString()
            });
        } catch (err) {
            console.error('Error getting listing details:', err);
        }
    };

    const handleBuyShares = async (listingId, maxShares, pricePerShare) => {
        try {
            if (!address) {
                setError("Please connect your wallet first");
                return;
            }

            // Get the property details for this listing
            const listing = listings.find(l => l.listingId === listingId.toString());
            if (!listing) {
                throw new Error("Listing not found");
            }

            // Check if buyer is the seller
            if (listing.seller.toLowerCase() === address.toLowerCase()) {
                setBuyErrors(prev => ({
                    ...prev,
                    [listingId]: "You cannot buy your own listed shares"
                }));
                return;
            }

            // Get property details to check owner
            const propertyDetails = await getPropertyFunction(listing.propertyId);
            if (!propertyDetails) {
                throw new Error("Property details not found");
            }

            // Check if buyer is the property owner - but now we allow it
            const isOwner = propertyDetails[0].owner.toLowerCase() === address.toLowerCase();

            await debugListing(listingId);

            const listingIdNumber = Number(listingId);
            if (isNaN(listingIdNumber)) {
                setBuyErrors(prev => ({
                    ...prev,
                    [listingId]: "Invalid listing ID"
                }));
                return;
            }

            const sharesToBuyAmount = sharesToBuy[listingId];
            if (!sharesToBuyAmount || sharesToBuyAmount <= 0) {
                setBuyErrors(prev => ({
                    ...prev,
                    [listingId]: "Please enter a valid number of shares"
                }));
                return;
            }

            if (sharesToBuyAmount > maxShares) {
                setBuyErrors(prev => ({
                    ...prev,
                    [listingId]: "Cannot buy more shares than available"
                }));
                return;
            }

            // Calculate total cost in Wei
            const totalCostWei = ethers.BigNumber.from(pricePerShare)
                .mul(ethers.BigNumber.from(sharesToBuyAmount));

            setIsBuyingBack(prev => ({
                ...prev,
                [listingId]: isOwner
            }));

            await buyListedSharesFunction(
                listingIdNumber,
                sharesToBuyAmount,
                {
                    value: totalCostWei
                }
            );

            // Clear states after successful purchase
            setSharesToBuy(prev => ({
                ...prev,
                [listingId]: ''
            }));
            setBuyErrors(prev => ({
                ...prev,
                [listingId]: ''
            }));
            setIsBuyingBack(prev => ({
                ...prev,
                [listingId]: false
            }));

            await fetchListings();
        } catch (err) {
            console.error('Failed to buy shares:', err);
            setBuyErrors(prev => ({
                ...prev,
                [listingId]: err.message || 'Transaction failed. Please try again.'
            }));
            setIsBuyingBack(prev => ({
                ...prev,
                [listingId]: false
            }));
        }
    };

    const handleCancelListing = async (listingId) => {
        try {
            setError(null);
            
            // Call the contract function
            await cancelListingFunction(listingId);
            
            // Refresh the listings
            await fetchListings();
            
            // Show success message
            setSuccessMessage("Listing cancelled successfully");
            
            // Clear success message after 3 seconds
            setTimeout(() => {
                setSuccessMessage("");
            }, 3000);
            
        } catch (err) {
            console.error("Error cancelling listing:", err);
            setError("Failed to cancel listing. Please try again.");
        }
    };

    const filteredAndSortedListings = listings
        .filter(listing => {
            // Search filter
            const propertyAddress = listing.property?.propertyAddress?.toLowerCase() || '';
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = propertyAddress.includes(searchLower);

            // Price filter
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

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <div className={styles.filters}>
                    <input
                        type="text"
                        placeholder="Search by address..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
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
                        console.log("Rendering listing:", listing);
                        
                        const numberOfShares = listing.numberOfShares.toString();
                        const priceInEth = ethers.utils.formatEther(listing.pricePerShare);
                        const totalPrice = (Number(numberOfShares) * Number(priceInEth)).toFixed(6);

                        return (
                            <div key={index} className={styles.listingCard}>
                                <div className={styles.listingHeader}>
                                    <div>
                                        {/* <div className={styles.listingId}>
                                            Listing ID: {listing.listingId !== undefined ? listing.listingId : 'N/A'}
                                        </div> */}
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
                                                >
                                                    Cancel Listing
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
                                                        ? (Number(ethers.utils.formatEther(listing.pricePerShare)) * 
                                                           Number(sharesToBuy[listing.listingId])).toFixed(6) 
                                                        : '0'} ETH
                                                </div>
                                                <button
                                                    className={`${styles.buyButton} ${listing.property?.owner.toLowerCase() === address.toLowerCase() ? styles.buybackButton : ''}`}
                                                    onClick={() => handleBuyShares(
                                                        listing.listingId,
                                                        listing.numberOfShares,
                                                        listing.pricePerShare
                                                    )}
                                                    disabled={!listing.isActive || !sharesToBuy[listing.listingId]}
                                                >
                                                    {listing.property?.owner.toLowerCase() === address.toLowerCase() 
                                                        ? (isBuyingBack[listing.listingId] ? 'Buying Back...' : 'Buy Back Shares')
                                                        : (isBuyingBack[listing.listingId] ? 'Buying...' : 'Buy Shares')}
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