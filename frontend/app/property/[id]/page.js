"use client"

import { useEffect, useState } from 'react';
import { useAppContext } from '../../../context';
import { useParams } from 'next/navigation';
import { ethers } from 'ethers';
import styles from './PropertyDetails.module.css';
import Navbar from '@/components/Navbar';
import ReviewModal from '@/components/ReviewModal';
import Link from 'next/link';

export default function PropertyDetails() {
  const { address, contract, getSinglePropertyFunction, buySharesFunction, getShareholderInfoFunction, checkisRentDueFunction, claimRentFunction, getRentPeriodStatus, payRentFunction, submitReviewFunction, getPropertyReviewsFunction } = useAppContext();
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

  useEffect(() => {
    let mounted = true;

    const fetchAllData = async () => {
      if (!params.id || !contract) return;
      
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [propertyData, shareholderInfo, rentDueStatus, periodStatus, reviewsData] = await Promise.all([
          getSinglePropertyFunction(params.id),
          getShareholderInfoFunction(params.id),
          checkisRentDueFunction(params.id),
          getRentPeriodStatus(params.id),
          getPropertyReviewsFunction(params.id)
        ]);

        console.log('Reviews Data:', reviewsData);

        if (!mounted) return;

        if (!propertyData || !propertyData[0]) {
          setError('Property not found');
          return;
        }

        setProperty(propertyData[0]);

        // Fetch additional data only if property exists
        setShareholdersInfo(shareholderInfo || []);
        setIsRentDue(rentDueStatus);
        setRentPeriodStatus(periodStatus);

        // Add reviews state update
        setReviews(reviewsData || []);

        console.log('Set Reviews:', reviewsData);
      } catch (err) {
        if (mounted) {
          console.error("Error fetching data:", err);
          setError(err.message || "Failed to load property");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
          setDataFetched(true);
        }
      }
    };

    fetchAllData();

    return () => {
      mounted = false;
    };
  }, [params.id, contract, getSinglePropertyFunction, getShareholderInfoFunction, checkisRentDueFunction, getRentPeriodStatus]);

  const getRentDueText = () => {
    if (!rentPeriodStatus) return "Loading...";
    if (isRentDue) return "Claim Rent";
    
    const daysRemaining = Math.ceil(rentPeriodStatus.remainingTime / (24 * 60 * 60));
    return `Rent due in ${daysRemaining} days`;
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
      // Refresh shareholder info after claiming
      const updatedInfo = await getShareholderInfoFunction(params.id);
      if (updatedInfo && Array.isArray(updatedInfo)) {
        setShareholdersInfo(updatedInfo);
      }
    } catch (error) {
      console.error("Error claiming rent:", error);
    }
  };

  const handlePayRent = async () => {
    try {
      if (!property || !property.rent) {
        throw new Error("Invalid property rent value");
      }

      // Make sure we're using the exact rent amount from the property
      const rentAmount = property.rent;
      console.log("Rent amount:", rentAmount.toString());

      await payRentFunction({
        propertyId: params.id,
        rent: rentAmount // Pass the BigNumber directly
      });

      // Refresh property data after paying rent
      const updatedProperty = await getSinglePropertyFunction(params.id);
      if (updatedProperty && updatedProperty[0]) {
        setProperty(updatedProperty[0]);
      }

      // Refresh rent status
      const rentDueStatus = await checkisRentDueFunction(params.id);
      setIsRentDue(rentDueStatus);

    } catch (error) {
      console.error("Error paying rent:", error);
    }
  };

  const handleReviewSubmit = async (rating, comment) => {
    try {
      await submitReviewFunction({
        propertyId: params.id,
        rating,
        comment
      });
      // Optionally refresh reviews here
    } catch (error) {
      console.error("Error submitting review:", error);
    }
  };

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
                          <span className={styles.label}>Rent Claimed:</span>
                          <span>
                            {holder.rentClaimed ? ethers.utils.formatEther(holder.rentClaimed) : '0'} ETH
                          </span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.label}>Unclaimed Rent:</span>
                          <span>
                            {holder.UnclaimedRent ? ethers.utils.formatEther(holder.UnclaimedRent) : '0'} ETH
                          </span>
                        </div>
                        {holder.UnclaimedRent && ethers.BigNumber.from(holder.UnclaimedRent).gt(0) && (
                          <button 
                            onClick={handleClaimRent}
                            className={styles.claimButton}
                            disabled={!isRentDue}
                            title={!isRentDue ? `Rent will be due in ${Math.ceil(rentPeriodStatus?.remainingTime / (24 * 60 * 60))} days` : "Click to claim your rent"}
                          >
                            {getRentDueText()}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className={styles.reviewSection}>
                  <button 
                    onClick={() => setIsReviewModalOpen(true)}
                    className={styles.reviewButton}
                  >
                    Write a Review
                  </button>
                </div>
              </div>
            )}

            <div className={styles.reviewsSection}>
              <h3>Property Reviews</h3>
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
                    </div>

                    <div className={styles.detailBox}>
                      <h3>Description</h3>
                      <p className={styles.description}>{property.description}</p>
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