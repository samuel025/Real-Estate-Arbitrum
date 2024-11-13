"use client"

import { use, useEffect, useState, useCallback } from 'react';
import { useAppContext } from '../../../context';
import { useParams } from 'next/navigation';
import { ethers } from 'ethers';
import styles from './PropertyDetails.module.css';
import Navbar from '@/components/Navbar';
import ReviewModal from '@/components/ReviewModal';
import Link from 'next/link';

export default function PropertyDetails() {
  const { address, contract, getSinglePropertyFunction, buySharesFunction, getShareholderInfoFunction, checkisRentDueFunction, claimRentFunction, getRentPeriodStatus, payRentFunction, submitReviewFunction, getPropertyReviewsFunction, listSharesForSaleFunction, isPeriodClaimedFunction, getRentPeriodsFunction, getAccruedRentFunction, getPropertyListingsFunction } = useAppContext();
  const [property, setProperty] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataFetched, setDataFetched] = useState(false);
  const params = useParams();
  const [sharesToBuy, setSharesToBuy] = useState(1);
  const [totalCost, setTotalCost] = useState('0');
  const [shareholdersInfo, setShareholdersInfo] = useState([]);
  const [isRentDue, setIsRentDue] = useState(false);
  const [rentPeriodStatus, setRentPeriodStatus] = useState(null);
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

  const fetchAllData = useCallback(async () => {
    if (!params.id || !contract) return;
    
    try {
      setIsLoading(true);
      setError(null);

      const [
        propertyData, 
        shareholderInfo, 
        rentDueStatus, 
        periodStatus, 
        reviewsData,
        rentPeriods,
        listings,
        hasReviewedStatus
      ] = await Promise.all([
        getSinglePropertyFunction(params.id),
        getShareholderInfoFunction(params.id),
        checkisRentDueFunction(params.id),
        getRentPeriodStatus(params.id),
        getPropertyReviewsFunction(params.id),
        getRentPeriodsFunction(params.id),
        getPropertyListingsFunction(params.id),
        contract.call('hasReviewed', [params.id, address])
      ]);

      setHasReviewed(hasReviewedStatus);

      if (!propertyData || !propertyData[0]) {
        setError('Property not found');
        return;
      }

      setProperty(propertyData[0]);
      setShareholdersInfo(shareholderInfo || []);
      setIsRentDue(rentDueStatus);
      setRentPeriodStatus(periodStatus);
      setReviews(reviewsData || []);
      setRentPeriods(rentPeriods);
      setPropertyListings(listings);

      if (shareholderInfo && shareholderInfo[0]) {
        setUnclaimedRent(shareholderInfo[0].UnclaimedRent);
        setUnclaimedRentAmount(ethers.utils.formatEther(shareholderInfo[0].UnclaimedRent));
      }

    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message || "Failed to load property");
    } finally {
      setIsLoading(false);
      setDataFetched(true);
    }
  }, [params.id, contract, getSinglePropertyFunction, getShareholderInfoFunction, 
      checkisRentDueFunction, getRentPeriodStatus, getPropertyReviewsFunction, 
      getRentPeriodsFunction, getPropertyListingsFunction]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const getRentDueText = () => {
    if (!rentPeriodStatus) return "Loading...";
    return 'Claim rent'
  };

  const handleBuyShares = (e) => {
    e.preventDefault();
    buySharesFunction({
      propertyId: property.propertyId,
      shares: sharesToBuy,
      price: totalCost.toString()
    });
  };


  const handleClaimRent = async () => {
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

  const handlePayRent = async () => {
    if (!property) return;
    
    try {
      setIsPayingRent(true);
      
      // Get the total required amount including any late fees and debt
      const lateFees = await contract.call('calculateLateFees', [params.id]);
      const rentStatus = await contract.call('getRentStatus', [params.id]);
      
      const totalRequired = ethers.BigNumber.from(property.rent)
        .add(lateFees)
        .add(rentStatus.totalDebt || 0);

      await payRentFunction({
        propertyId: params.id,
        rent: totalRequired
      });

      // Refresh data after successful payment
      await fetchAllData();
    } catch (error) {
      console.error("Error paying rent:", error);
    } finally {
      setIsPayingRent(false);
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
    setListingError('');

    try {
      // Input validation
      if (!sharesToSell || sharesToSell <= 0) {
        setListingError('Please enter a valid number of shares');
        return;
      }

      if (!pricePerShare || parseFloat(pricePerShare) <= 0) {
        setListingError('Please enter a valid price');
        return;
      }

      // Ensure price is formatted correctly (max 18 decimals)
      const formattedPrice = parseFloat(pricePerShare).toFixed(18);

      console.log("Listing shares with values:", {
        propertyId: params.id,
        shares: sharesToSell,
        price: formattedPrice
      });

      await listSharesForSaleFunction({
        propertyId: params.id,
        shares: sharesToSell,
        pricePerShare: formattedPrice
      });

      setSharesToSell(1);
      setPricePerShare('');
      alert('Shares listed successfully!');
      
      await checkShareListingEligibility();
    } catch (error) {
      console.error("Full error:", error);
      
      // Extract error message
      let errorMessage = "Failed to list shares: ";
      if (error.reason) errorMessage += error.reason;
      else if (error.message) errorMessage += error.message;
      else errorMessage += "Unknown error occurred";
      
      setListingError(errorMessage);
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
                    disabled={!isRentDue}
                    title={!isRentDue ? `Rent is not due yet` : "Click to pay rent"}
                  >
                    Pay Rent ({ethers.utils.formatEther(property.rent)} ETH)
                  </button>
                </div>
              )}
            </div>

            {shareholdersInfo.length > 0 && address !== property.owner && (
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
                      {property.shares && (
                        <div className={styles.detailItem}>
                          <span className={styles.label}>Total Shares:</span>
                          <span>{property.shares}</span>
                        </div>
                      )}
                      {property.AvailableShares && (
                        <div className={styles.detailItem}>
                          <span className={styles.label}>Available Shares:</span>
                          <span>{property.AvailableShares}</span>
                        </div>
                      )}
                      <div className={styles.detailItem}>
                        <span className={styles.label}>Listed Shares:</span>
                        <span>{propertyListings?.reduce((total, listing) => 
                          listing.isActive ? total + parseInt(listing.numberOfShares) : total, 0) || 0}</span>
                      </div>
                    </div>

                    <div className={styles.detailBox}>
                      <h3>Rent Period Information</h3>
                      {rentPeriodStatus && (
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
                                {Math.ceil(rentPeriodStatus.remainingTime / (24 * 60 * 60))} days
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {property?.AvailableShares > 0 && property.owner !== address && address && (
                  <div className={styles.buySection}>
                    <h3>Purchase Shares</h3>
                    <form onSubmit={handleBuyShares} className={styles.buySharesForm}>
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