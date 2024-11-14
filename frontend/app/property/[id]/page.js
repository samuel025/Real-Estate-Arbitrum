"use client"

import { useEffect, useState, useCallback } from 'react';
import { useAppContext } from '../../../context';
import { useParams } from 'next/navigation';
import { ethers } from 'ethers';
import styles from './PropertyDetails.module.css';
import Navbar from '@/components/Navbar';
import ReviewModal from '@/components/ReviewModal';
import Link from 'next/link';

export default function PropertyDetails() {
  const { address, contract, getSinglePropertyFunction, buySharesFunction, getShareholderInfoFunction, checkisRentDueFunction, claimRentFunction, getRentPeriodStatus, payRentFunction, submitReviewFunction, getPropertyReviewsFunction, listSharesForSaleFunction, isPeriodClaimedFunction, getRentPeriodsFunction, getAccruedRentFunction, getPropertyListingsFunction, getActiveListingsFunction, isContractLoading, connect } = useAppContext();
  const [property, setProperty] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataFetched, setDataFetched] = useState(false);
  const params = useParams();
  const [sharesToBuy, setSharesToBuy] = useState(1);
  const [totalCost, setTotalCost] = useState('0');
  const [shareholdersInfo, setShareholdersInfo] = useState([]);
  const [isRentDue, setIsRentDue] = useState(false);
  const [rentPeriodStatus, setRentPeriodStatus] = useState({
    isActive: false,
    periodStart: null,
    periodEnd: null,
    remainingTime: 0
  });
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [sharesToSell, setSharesToSell] = useState(1);
  const [sellError, setSellError] = useState('');
  const [pricePerShare, setPricePerShare] = useState('');
  const [listingError, setListingError] = useState('');
  const [unclaimedRent, setUnclaimedRent] = useState(null);
  const [rentClaimStatus, setRentClaimStatus] = useState({
    hasUnclaimedRent: false,
    unclaimedAmount: '0',
    canListShares: true
  });
  const [rentPeriods, setRentPeriods] = useState([]);
  const [unclaimedRentAmount, setUnclaimedRentAmount] = useState('0');
  const [totalRequiredAmount, setTotalRequiredAmount] = useState(null);
  const [isPayingRent, setIsPayingRent] = useState(false);
  const [accruedRentInfo, setAccruedRentInfo] = useState({
    amount: '0',
    periodStart: null,
    periodEnd: null,
    lastClaim: null
  });
  const [propertyListings, setPropertyListings] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState(null);
  const [listings, setListings] = useState([]);
  const [totalListedShares, setTotalListedShares] = useState(0);
  const [rentStatus, setRentStatus] = useState({
    isRentDue: false,
    nextPaymentDate: null,
    totalRequired: "0"
  });

  const calculateTotalCost = (shares) => {
    if (!property?.price || !property?.shares) return '0';
    try {
      const totalPriceInWei = ethers.BigNumber.from(property.price);
      const totalShares = ethers.BigNumber.from(property.shares);
      const pricePerShareInWei = totalPriceInWei.div(totalShares);
      const totalCostInWei = pricePerShareInWei.mul(shares);
      const ethValue = ethers.utils.formatEther(totalCostInWei);
      return parseFloat(ethValue).toString();
    } catch (error) {
      console.error('Error calculating total cost:', error);
      return '0';
    }
  };

  useEffect(() => {
    const newTotalCost = calculateTotalCost(sharesToBuy);
    setTotalCost(newTotalCost);
  }, [sharesToBuy, property?.price]);

  const calculateTotalListedShares = useCallback((listings) => {
    if (!listings || !Array.isArray(listings)) {
        console.log("No listings available");
        return 0;
    }
    
    const total = listings.reduce((sum, listing) => {
        if (listing?.isActive && listing?.propertyId === params.id) {
            const shares = parseInt(listing.numberOfShares || '0');
            console.log(`Adding ${shares} shares from listing:`, listing);
            return sum + (isNaN(shares) ? 0 : shares);
        }
        return sum;
    }, 0);
    
    console.log("Total listed shares calculated:", total);
    return total;
  }, [params.id]);

  const fetchAllData = useCallback(async () => {
    if (!params.id || !contract) return;
    
    try {
        setIsLoading(true);
        setError(null);

        // Get property data
        const propertyData = await getSinglePropertyFunction(params.id);
        setProperty(propertyData?.[0] || null);

        // Get listings with error handling
        let listings = [];
        try {
            listings = await getPropertyListingsFunction(params.id);
            console.log("Fetched listings:", listings); // Debug log
        } catch (listingError) {
            console.error("Error fetching listings:", listingError);
            listings = [];
        }
        
        setPropertyListings(listings);
        const totalListed = calculateTotalListedShares(listings);
        setTotalListedShares(totalListed);
        console.log("Total listed shares:", totalListed); // Debug log

        // Get shareholder info if address exists
        if (address) {
            try {
                const shareholderData = await getShareholderInfoFunction(params.id);
                setShareholdersInfo(shareholderData || []);
            } catch (shareholderError) {
                console.error("Error fetching shareholder info:", shareholderError);
                setShareholdersInfo([]);
            }
        }

        // Add rent period status check
        try {
          const rentStatus = await getRentPeriodStatus(params.id);
          console.log("Rent period status:", rentStatus); // Debug log
          
          setRentPeriodStatus({
            isActive: Boolean(rentStatus.isActive),
            periodStart: rentStatus.periodStart ? new Date(Number(rentStatus.periodStart) * 1000) : null,
            periodEnd: rentStatus.periodEnd ? new Date(Number(rentStatus.periodEnd) * 1000) : null,
            remainingTime: Number(rentStatus.remainingTime || 0)
          });
        } catch (rentError) {
          console.error("Error fetching rent period status:", rentError);
        }

        setDataFetched(true);
    } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message || "Failed to load property");
    } finally {
        setIsLoading(false);
    }
  }, [
    params.id, 
    contract, 
    address, 
    getSinglePropertyFunction, 
    getPropertyListingsFunction,
    calculateTotalListedShares,
    getRentPeriodStatus
  ]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const getRentDueText = () => {
    if (!rentPeriodStatus) return "Loading...";
    return 'Claim rent'
  };

  const handleInitialSharePurchase = async (e) => {
    e.preventDefault();
    try {
      if (!sharesToBuy || sharesToBuy <= 0) {
        throw new Error("Invalid number of shares");
      }

      const sharePrice = ethers.utils.parseEther(calculateTotalCost(1));
      const totalCost = sharePrice.mul(sharesToBuy);

      await buySharesFunction({
        propertyId: params.id,
        shares: sharesToBuy,
        price: ethers.utils.formatEther(totalCost)
      });

      await fetchAllData();
      setSuccessMessage("Shares purchased successfully!");
    } catch (error) {
      console.error("Failed to buy initial shares:", error);
      setError(error.message || "Failed to buy shares");
    }
  };

  const handleBuyListedShares = async (listing) => {
    try {
        if (!listing || !listing.listingId) {
            throw new Error("Invalid listing data");
        }

        console.log("Attempting to buy shares:", {
            listingId: listing.listingId,
            numberOfShares: listing.numberOfShares,
            pricePerShare: listing.pricePerShare
        });

        const totalCost = (
            parseFloat(listing.pricePerShare) * 
            parseFloat(listing.numberOfShares)
        ).toString();

        await buyListedSharesFunction(
            listing.listingId,
            listing.numberOfShares,
            totalCost
        );

        // Refresh the data
        await fetchAllData();
        setSuccessMessage("Shares purchased successfully!");
    } catch (error) {
        console.error("Failed to buy listed shares:", error);
        setError(error.message || "Failed to buy shares");
    }
  };

  const handleClaimRent = async () => {
    if (!address) return;
    try {
      await claimRentFunction({
        propertyId: params.id,
        shareholder: address
      });
      const updatedInfo = await getShareholderInfoFunction(params.id);
      if (updatedInfo && Array.isArray(updatedInfo)) {
        setShareholdersInfo(updatedInfo);
      }
    } catch (error) {
      console.error("Error claiming rent:", error);
    }
  };

  const handlePayRent = async (e) => {
    e.preventDefault();
    try {
      setSellError('');
      
      // Double check if rent is actually due
      const isRentDue = await contract.call('isRentDue', [params.id]);
      if (!isRentDue) {
        setSellError('Rent is not due yet');
        return;
      }

      // Get the total required amount including rent, late fees, and any debt
      const totalRequired = await getTotalRequiredAmount();
      
      // Call payRent with the correct value in the transaction
      await contract.call(
        'payRent',
        [params.id, address],
        { 
          value: ethers.utils.parseEther(totalRequired) // Convert ETH amount to Wei
        }
      );

      await fetchAllData();
      setSuccessMessage('Rent paid successfully!');
    } catch (error) {
      console.error("Error paying rent:", error);
      setSellError(error.message || "Failed to pay rent");
    }
  };

  const handleReviewSubmit = async (rating, comment) => {
    try {
      await submitReviewFunction({
        propertyId: params.id,
        rating,
        comment
      });
    } catch (error) {
      console.error("Error submitting review:", error);
    }
  };

  const checkShareListingEligibility = async () => {
    if (!property || !address) return;

    try {
      const shareholderInfo = await getShareholderInfoFunction(params.id);
      
      const unclaimedAmount = ethers.utils.formatEther(shareholderInfo[0].UnclaimedRent);
      const hasUnclaimed = parseFloat(unclaimedAmount) > 0;

      setRentClaimStatus({
        hasUnclaimedRent: hasUnclaimed,
        unclaimedAmount: unclaimedAmount,
        canListShares: !hasUnclaimed
      });

    } catch (error) {
      console.error("Error checking listing eligibility:", error);
    }
  };

  const handleListShares = async (e) => {
    e.preventDefault();
    try {
        setSellError('');

        // Convert shares to number and validate
        const numberOfShares = parseInt(sharesToSell);
        if (isNaN(numberOfShares) || numberOfShares <= 0) {
            throw new Error("Number of shares must be greater than 0");
        }

        // Validate price
        const priceAsNumber = parseFloat(pricePerShare);
        if (isNaN(priceAsNumber) || priceAsNumber <= 0) {
            throw new Error("Invalid price format");
        }

        await listSharesForSaleFunction(
            params.id,
            numberOfShares,  // Use the converted number
            pricePerShare
        );

        setPricePerShare('');
        setSharesToSell(1);
        await fetchAllData();

    } catch (error) {
        console.error("Error listing shares:", error);
        setSellError(error.message || "Failed to list shares");
    }
  };

  // Check if the user has shares
  const userShares = shareholdersInfo[0]?.shares ? parseInt(shareholdersInfo[0].shares) : 0;

  // Add a function to display the total required amount
  const getTotalRequiredAmount = async () => {
    try {
      const lateFees = await contract.call('calculateLateFees', [params.id]);
      const rentStatus = await contract.call('getRentStatus', [params.id]);
      
      const totalRequired = ethers.BigNumber.from(property.rent)
        .add(lateFees)
        .add(rentStatus.totalDebt || 0);

      return ethers.utils.formatEther(totalRequired);
    } catch (error) {
      console.error("Error calculating total required amount:", error);
      return ethers.utils.formatEther(property.rent); // fallback to just rent amount
    }
  };

  // Update your UI to show the total required amount
  useEffect(() => {
    if (property) {
      getTotalRequiredAmount().then(amount => {
        setTotalRequiredAmount(amount);
      });
    }
  }, [property]);

  useEffect(() => {
    const fetchAccruedRent = async () => {
      if (!params.id || !address) return;
      
      try {
        const rentInfo = await getAccruedRentFunction(params.id, address);
        setAccruedRentInfo({
          accruedRent: rentInfo.accruedRent,
          periodStart: rentInfo.periodStart,
          periodEnd: rentInfo.periodEnd,
          lastClaim: rentInfo.lastClaim
        });
      } catch (error) {
        console.error("Error fetching accrued rent:", error);
      }
    };

    fetchAccruedRent();
  }, [params.id, address, getAccruedRentFunction]);

  const fetchPropertyListings = async () => {
    if (!contract || !params.id) return;
    
    try {
        setListingsLoading(true);
        setListingsError(null);
        
        const listings = await getPropertyListingsFunction(params.id);
        console.log("Fetched listings:", listings);
        
        if (Array.isArray(listings)) {
            setPropertyListings(listings);
            const totalShares = calculateTotalListedShares(listings);
            setTotalListedShares(totalShares);
            console.log("Updated total listed shares:", totalShares);
        } else {
            console.error("Invalid listings data:", listings);
            setListingsError("Failed to load listings format");
        }
    } catch (error) {
        console.error("Error fetching property listings:", error);
        setListingsError("Failed to load listings");
    } finally {
        setListingsLoading(false);
    }
  };

  useEffect(() => {
    fetchPropertyListings();
  }, [contract, params.id, getPropertyListingsFunction]);

  const fetchListings = async () => {
    if (!contract) {
        console.log("Contract not initialized yet");
        return;
    }

    try {
        setListingsLoading(true);
        const listings = await getActiveListingsFunction();
        console.log("Fetched listings:", listings);
        setListings(listings);
    } catch (error) {
        console.error("Error fetching listings:", error);
        setListingsError("Failed to fetch listings");
    } finally {
        setListingsLoading(false);
    }
  };

  // Modify the useEffect to wait for contract
  useEffect(() => {
    if (contract) {
        fetchListings();
    }
  }, [contract]); // Add contract as dependency

  useEffect(() => {
    const checkRentStatus = async () => {
        if (!contract || !property || !address) return;

        try {
            // Check if rent is due
            const isRentDue = await contract.call('isRentDue', [params.id]);
            const rentStatusData = await contract.call('getRentStatus', [params.id]);
            const totalRequired = await getTotalRequiredAmount();

            setRentStatus({
                isRentDue,
                nextPaymentDate: rentStatusData.nextPaymentDate,
                totalRequired
            });

            console.log("Rent Status:", {
                isRentDue,
                rentStatusData,
                totalRequired
            });

        } catch (error) {
            console.error("Error checking rent status:", error);
        }
    };

    checkRentStatus();
  }, [contract, property, address, params.id]);

  if (isLoading || !dataFetched) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <div className={styles.loadingSpinner}>Loading...</div>
        </div>
      </>
    );
  }

  if (error && dataFetched) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <div className={styles.error}>{error}</div>
        </div>
      </>
    );
  }

  if (!property && dataFetched) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <div className={styles.error}>Property not found</div>
        </div>
      </>
    );
  }

  if (!address) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <div className={styles.connectWalletMessage}>
            <h2>Please Connect Your Wallet</h2>
            <button 
              onClick={connect} 
              className={styles.connectButton}
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <div className={styles.propertyDetails}>
          <div className={styles.leftColumn}>
            <div className={styles.imageSection}>
              {property.image && (
                <img 
                  src={property.image} 
                  alt={property.title} 
                  className={styles.propertyImage}
                />
              )}
              {property.owner === address && (
                <div className={styles.ownerActions}>
                  <button 
                    onClick={handlePayRent}
                    className={styles.payRentButton}
                    disabled={!rentStatus.isRentDue}
                    title={!rentStatus.isRentDue 
                        ? `Rent is not due yet` 
                        : `Click to pay rent (${rentStatus.totalRequired} ETH)`}
                  >
                    Pay Rent ({rentStatus.totalRequired} ETH)
                  </button>
                  {!rentStatus.isRentDue && (
                    <div className={styles.nextPaymentInfo}>
                        Next payment due: {rentStatus.nextPaymentDate 
                            ? new Date(rentStatus.nextPaymentDate * 1000).toLocaleDateString()
                            : 'Not set'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {shareholdersInfo?.length > 0 && address !== property.owner && (
              <div className={styles.shareholderSection}>
                <h3>Your Shares</h3>
                <div className={styles.shareholdersGrid}>
                  {shareholdersInfo.map((holder, index) => (
                    <div key={index} className={styles.shareholderCard}>
                      <h4>Information</h4>
                      <div className={styles.shareholderInfo}>
                        <div className={styles.detailItem}>
                          <span className={styles.label}>Shares Owned:</span>
                          <span>{holder.shares?.toString() || '0'}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.label}>Shares Listed:</span>
                          <span>{propertyListings?.reduce((total, listing) => 
                            listing.isActive && listing.seller === address 
                              ? total + parseInt(listing.numberOfShares) 
                              : total, 0) || '0'}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.label}>Rent Claimed:</span>
                          <span>
                            {holder.rentClaimed ? ethers.utils.formatEther(holder.rentClaimed) : '0'} ETH
                          </span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.label}>Accrued Rent:</span>
                          <span>{accruedRentInfo.accruedRent || '0'} ETH</span>
                        </div>
                        {parseFloat(accruedRentInfo.accruedRent) > 0 && (
                          <button 
                            onClick={handleClaimRent}
                            className={styles.claimButton}
                            disabled={!rentPeriodStatus?.isActive}
                            title={!rentPeriodStatus?.isActive ? 
                              `Rent period not active` : 
                              "Click to claim your accrued rent"}
                          >
                            Claim Accrued Rent
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.reviewsSection}>
              <div className={styles.reviewsHeader}>
                <h3>Property Reviews</h3>
                {!hasReviewed && shareholdersInfo[0]?.shares > 0 && (
                  <button 
                    onClick={() => setIsReviewModalOpen(true)}
                    className={styles.reviewButton}
                  >
                    Write a Review
                  </button>
                )}
              </div>
              {reviews && reviews.length > 0 ? (
                <div className={styles.reviewsGrid}>
                  {reviews.map((review, index) => (
                    <div key={index} className={styles.reviewCard}>
                      <div className={styles.reviewRating}>
                        {[...Array(parseInt(review.rating))].map((_, i) => (
                          <span key={i} className={`${styles.star} ${styles.filled}`}>★</span>
                        ))}
                        {[...Array(5 - parseInt(review.rating))].map((_, i) => (
                          <span key={i} className={styles.star}>★</span>
                        ))}
                      </div>
                      <p className={styles.reviewComment}>{review.comment}</p>
                      <div className={styles.reviewFooter}>
                        <span className={styles.reviewerAddress}>
                          {`${review.reviewer.slice(0, 6)}...${review.reviewer.slice(-4)}`}
                        </span>
                        <span className={styles.reviewDate}>
                          {new Date(Number(review.timestamp) * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.noReviews}>No reviews yet.</p>
              )}
            </div>
          </div>

          

          <div className={styles.rightColumn}>
            <div className={styles.contentSection}>
              <div className={styles.propertyCard}>
                <h1 className={styles.title}>{property.title}</h1>
                
                <div className={styles.propertyDetailsGrid}>
                  <div className={styles.detailsColumn}>
                    <div className={styles.detailBox}>
                      <h3>Price Details</h3>
                      <div className={styles.detailItem}>
                        <span className={styles.label}>Price:</span>
                        <span className={styles.price}>{ethers.utils.formatEther(property.price)} ETH</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.label}>Monthly Rent:</span>
                        <span className={styles.rent}>{ethers.utils.formatEther(property.rent)} ETH</span>
                      </div>
                    </div>

                    <div className={styles.detailBox}>
                      <h3>Property Details</h3>
                      <div className={styles.detailItem}>
                        <span className={styles.label}>Property ID:</span>
                        <span>{property.propertyId}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.label}>Location:</span>
                        <span>{property.propertyAddress}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.label}>Owner:</span>
                        <span className={styles.address}>{property.owner}</span>
                      </div>
                      
                      {property.owner === address && (
                        <Link 
                          href={`/update/${property.propertyId}`}
                          className={styles.updateButton}
                        >
                          Update Property Details
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className={styles.detailsColumn}>
                    <div className={styles.detailBox}>
                      <h3>Share Information</h3>
                      {property?.shares && (
                        <div className={styles.detailItem}>
                          <span className={styles.label}>Total Shares:</span>
                          <span>{property.shares}</span>
                        </div>
                      )}
                      {property?.AvailableShares && (
                        <div className={styles.detailItem}>
                          <span className={styles.label}>Available Shares:</span>
                          <span>{property.AvailableShares}</span>
                        </div>
                      )}
                      <div className={styles.detailItem}>
                        <span className={styles.label}>Listed Shares:</span>
                        <span>{totalListedShares}</span>
                      </div>
                      {shareholdersInfo?.[0] && (
                        <div className={styles.detailItem}>
                          <span className={styles.label}>Your Shares:</span>
                          <span>{shareholdersInfo[0].shares.toString()}</span>
                        </div>
                      )}
                    </div>

                    <div className={styles.detailBox}>
                      <h3>Rent Period Information</h3>
                      {rentPeriodStatus ? (
                        <>
                          <div className={styles.detailItem}>
                            <span className={styles.label}>Period Start:</span>
                            <span>
                              {rentPeriodStatus.periodStart?.toLocaleDateString() || 'Not started'}
                            </span>
                          </div>
                          <div className={styles.detailItem}>
                            <span className={styles.label}>Period End:</span>
                            <span>
                              {rentPeriodStatus.periodEnd?.toLocaleDateString() || 'Not set'}
                            </span>
                          </div>
                          <div className={styles.detailItem}>
                            <span className={styles.label}>Status:</span>
                            <span className={`${styles.status} ${rentPeriodStatus.isActive ? styles.active : styles.inactive}`}>
                              {rentPeriodStatus.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          {rentPeriodStatus.isActive && (
                            <div className={styles.detailItem}>
                              <span className={styles.label}>Time Remaining:</span>
                              <span>
                                {Math.max(0, Math.ceil(rentPeriodStatus.remainingTime / (24 * 60 * 60)))} days
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className={styles.detailItem}>
                          <span className={`${styles.status} ${styles.inactive}`}>
                            Loading Rent Period Status...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {property?.AvailableShares > 0 && property.owner !== address && address && (
                  <div className={styles.buySection}>
                    <h3>Purchase Shares</h3>
                    <form onSubmit={handleInitialSharePurchase} className={styles.buySharesForm}>
                      <div className={styles.formGroup}>
                        <label htmlFor="shares">Number of Shares:</label>
                        <input
                          type="number"
                          id="shares"
                          min="1"
                          max={property.AvailableShares}
                          value={sharesToBuy}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || value === '0') {
                              setSharesToBuy('');
                            } else {
                              setSharesToBuy(Math.min(
                                Math.max(1, parseInt(value)), 
                                property.AvailableShares
                              ));
                            }
                          }}
                          required
                        />
                      </div>
                      <div className={styles.costSummary}>
                        <div className={styles.costItem}>
                          <span>Price per share:</span>
                          <span>{calculateTotalCost(1)} ETH</span>
                        </div>
                        <div className={styles.costItem}>
                          <span>Total Cost:</span>
                          <span>{totalCost} ETH</span>
                        </div>
                      </div>
                      <button type="submit" className={styles.buyButton}>
                        Buy Shares
                      </button>
                    </form>
                  </div>
                )}
                {property.owner !== address && address && userShares > 0 && (
                  <div className={styles.sellSection}>
                    {listingError && <div className={styles.errorMessage}>{listingError}</div>}
                    
                    <h3>List Shares for Sale</h3>
                    <form onSubmit={handleListShares} className={styles.sellSharesForm}>
                      <div className={styles.formGroup}>
                        <label htmlFor="sharesToSell">Number of Shares to List:</label>
                        <input
                          type="number"
                          id="sharesToSell"
                          min="1"
                          max={userShares}
                          value={sharesToSell}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || value === '0') {
                              setSharesToSell('');
                            } else {
                              setSharesToSell(Math.min(Math.max(1, parseInt(value)), userShares));
                            }
                          }}
                          required
                          className={styles.inputField}
                        />
                      </div>
                      
                      <div className={styles.formGroup}>
                        <label htmlFor="pricePerShare">Price per Share (ETH):</label>
                        <input
                          type="text"
                          id="pricePerShare"
                          value={pricePerShare}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              setPricePerShare(value);
                            }
                          }}
                          required
                          className={styles.inputField}
                          placeholder="0.00"
                        />
                      </div>

                      <div className={styles.costSummary}>
                        <div className={styles.costItem}>
                          <span>Total Value:</span>
                          <span>{pricePerShare && sharesToSell ? 
                            (parseFloat(pricePerShare) * sharesToSell).toFixed(18) : '0'} ETH</span>
                        </div>
                        <div className={styles.costItem}>
                          <span>Platform Fee (0.5%):</span>
                          <span>{pricePerShare && sharesToSell ? 
                            (parseFloat(pricePerShare) * sharesToSell * 0.005).toFixed(18) : '0'} ETH</span>
                        </div>
                      </div>

                      <button type="submit" className={styles.listButton}>
                        List Shares for Sale
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
      
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSubmit={handleReviewSubmit}
      />

      

      
    </>
  );
}

export const dynamic = 'force-dynamic';


