"use client"

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAppContext } from '../../../context';
import { useRouter, useParams } from 'next/navigation';
import { ethers } from 'ethers';
import styles from './PropertyDetails.module.css';
import Navbar from '@/components/Navbar';
import ReviewModal from '@/components/ReviewModal';
import LoadingSpinner from '@/components/LoadingSpinner';
import Link from 'next/link';

const formatBlockchainDate = (timestamp) => {
    if (!timestamp) return 'Not set';
    
    try {
        const timestampNum = typeof timestamp === 'string' ? 
            parseInt(timestamp) : Number(timestamp);
        
        const date = new Date(timestampNum * 1000);
 
        if (isNaN(date.getTime())) {
            console.error('Invalid date from timestamp:', timestamp);
            return 'Invalid date';
        }

        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'UTC' 
        }).format(date);
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Error formatting date';
    }
};

const formatBigNumber = (value) => {
  if (!value) return '0';
  try {
    if (typeof value === 'string' && value.includes('.')) {
      return value;
    }
    if (value._isBigNumber) {
      return ethers.utils.formatEther(value);
    }
    return ethers.utils.formatEther(ethers.BigNumber.from(value));
  } catch (error) {
    console.error('Error formatting BigNumber:', error);
    return '0';
  }
};

const formatAccruedRent = (value) => {
  if (!value) return '0';
  try {

    if (value._isBigNumber) {
      return ethers.utils.formatEther(value);
    }
    if (typeof value === 'string' && value.startsWith('0x')) {
      return ethers.utils.formatEther(value);
    }
    if (typeof value === 'string' && value.includes('.')) {
      return value;
    }
    return ethers.utils.formatEther(ethers.BigNumber.from(value));
  } catch (error) {
    console.error("Error formatting accrued rent:", error, "Value:", value);
    return '0';
  }
};

export default function PropertyDetails() {
  const { address, contract, getSinglePropertyFunction, buySharesFunction, getShareholderInfoFunction, deletePropertyMessageFunction, checkisRentDueFunction, removePropertyFunction, claimRentFunction, getRentPeriodStatus, payRentFunction, calculateLateFeesFunction, submitReviewFunction, getPropertyReviewsFunction, listSharesForSaleFunction, isPeriodClaimedFunction, getRentPeriodsFunction, getAccruedRentFunction, getPropertyListingsFunction, isContractLoading, propertyMessageFunction, connect } = useAppContext();
  const [property, setProperty] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataFetched, setDataFetched] = useState(false);
  const router = useRouter();
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
  const [isListingShares, setIsListingShares] = useState(false);
  const [listingSuccess, setListingSuccess] = useState('');
  const [totalUserShares, setTotalUserShares] = useState(0);
  const [isContractReady, setIsContractReady] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [errorState, setErrorState] = useState({
    message: null,
    type: null  
  });
  const [rentPaymentAmount, setRentPaymentAmount] = useState('0');
  const [propertyMessage, setPropertyMessage] = useState({
    message: '',
    timestamp: null,
    sender: '',
    isActive: false
  });
  const [newMessage, setNewMessage] = useState('');
  const [isPostingMessage, setIsPostingMessage] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [contractOwner, setContractOwner] = useState(null);

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
        return 0;
    }
    
    const total = listings.reduce((sum, listing) => {
        if (listing?.isActive && listing?.propertyId === params.id) {
            const shares = parseInt(listing.numberOfShares || '0');
            return sum + (isNaN(shares) ? 0 : shares);
        }
        return sum;
    }, 0);
    
    return total;
  }, [params.id]);

  const fetchAllData = useCallback(async () => {
    if (!params.id || !contract || isContractLoading) return;
    
    try {
        setIsLoading(true);
        setErrorState({ message: null, type: null });

        const [
            propertyData,
            listings,
            shareholderData,
            rentStatus,
            reviewsData,
            accruedRentInfo,
            rentPeriods
        ] = await Promise.all([
            getSinglePropertyFunction(params.id),
            getPropertyListingsFunction(params.id),
            address ? getShareholderInfoFunction(params.id) : null,
            getRentPeriodStatus(params.id),
            getPropertyReviewsFunction(params.id),
            address ? getAccruedRentFunction(params.id, address) : null,
            getRentPeriodsFunction ? getRentPeriodsFunction(params.id) : null
        ]);

        if (!propertyData?.[0]) {
            throw new Error("Property not found");
        }

        setProperty(propertyData[0]);
        setPropertyListings(listings || []);
        setTotalListedShares(calculateTotalListedShares(listings));
        
        if (shareholderData?.[0]) {
            setShareholdersInfo(shareholderData);
            setTotalUserShares(parseInt(shareholderData[0].shares) || 0);
            
            if (shareholderData[0].rentClaimed) {
                const formattedClaimedRent = formatBigNumber(shareholderData[0].rentClaimed);
            }
        }

        setRentPeriodStatus({
            isActive: Boolean(rentStatus.isActive),
            periodStart: rentStatus.periodStart,
            periodEnd: rentStatus.periodEnd,
            remainingTime: Number(rentStatus.remainingTime || 0)
        });

        if (accruedRentInfo) {         
          const formattedAmount = formatAccruedRent(accruedRentInfo.accruedRent);
          setAccruedRentInfo({
              amount: formattedAmount,
              periodStart: accruedRentInfo.periodStart,
              periodEnd: accruedRentInfo.periodEnd,
              lastClaim: accruedRentInfo.lastClaim
          });
        }

        if (rentPeriods) {
            setRentPeriods(rentPeriods);
        }

        setDataFetched(true);
    } catch (err) {
        console.error("Error fetching data:", err);
        setErrorState({
            message: err.message || "Failed to load property data",
            type: 'fetch'
        });
    } finally {
        setIsLoading(false);
    }
  }, [
    params.id,
    contract,
    address,
    isContractLoading,
    getSinglePropertyFunction,
    getPropertyListingsFunction,
    getShareholderInfoFunction,
    getRentPeriodStatus,
    getPropertyReviewsFunction,
    getAccruedRentFunction,
    calculateTotalListedShares
  ]);

  useEffect(() => {
    let mounted = true;

    if (contract && !isContractLoading && !dataFetched) {
        fetchAllData();
    }

    return () => {
        mounted = false;
    };
  }, [contract, isContractLoading, dataFetched, fetchAllData]);

  useEffect(() => {
    let intervalId;

    const updateAccruedRent = async () => {
      if (!address || !contract || !params.id) return;

      try {
        const [rentInfo, rentStatus] = await Promise.all([
          getAccruedRentFunction(params.id, address),
          getRentPeriodStatus(params.id)
        ]);

        setAccruedRentInfo({
          amount: formatAccruedRent(rentInfo.accruedRent),
          periodStart: rentInfo.periodStart,
          periodEnd: rentInfo.periodEnd,
          lastClaim: rentInfo.lastClaim
        });

        setRentPeriodStatus({
          isActive: Boolean(rentStatus.isActive),
          periodStart: rentStatus.periodStart,
          periodEnd: rentStatus.periodEnd,
          remainingTime: Number(rentStatus.remainingTime || 0)
        });
      } catch (error) {
        console.error("Error updating rent info:", error);
      }
    };

    if (rentPeriodStatus?.isActive && address && contract) {
      updateAccruedRent();
      
      intervalId = setInterval(updateAccruedRent, 3000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [
    params.id,
    address,
    contract,
    rentPeriodStatus?.isActive,
    getAccruedRentFunction,
    getRentPeriodStatus
  ]);

  const handleInitialSharePurchase = async (e) => {
    e.preventDefault();
    setErrorState({ message: null, type: null });
    
    try {
        setIsLoading(true);
        
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

        setSuccessMessage("Shares purchased successfully!");
        
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch (error) {
        console.error("Failed to buy shares:", error);
        setErrorState({
            message: error.message.includes('user rejected') 
                ? 'Transaction cancelled'
                : 'Failed to purchase shares. Please check your wallet balance and try again.',
            type: 'transaction'
        });
    } finally {
        setIsLoading(false);
    }
  };


  const handleClaimRent = async () => {
    if (!address) return;
    try {
        const claimButton = document.querySelector('.claimButton');
        if (claimButton) claimButton.disabled = true;

        await claimRentFunction({
            propertyId: params.id,
            shareholder: address
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        const [updatedShareholderInfo, updatedAccruedRent] = await Promise.all([
            getShareholderInfoFunction(params.id),
            getAccruedRentFunction(params.id, address)
        ]);

        if (updatedShareholderInfo?.[0]) {
            setShareholdersInfo(prev => {
                const updated = [...prev];
                updated[0] = {
                    ...updated[0],
                    rentClaimed: updatedShareholderInfo[0].rentClaimed
                };
                return updated;
            });
        }

        if (updatedAccruedRent) {
            const formattedAmount = formatAccruedRent(updatedAccruedRent.accruedRent);
            setAccruedRentInfo(prev => ({
                ...prev,
                amount: formattedAmount,
                lastClaim: updatedAccruedRent.lastClaim
            }));
        }

        setSuccessMessage('Rent claimed successfully!');
        setTimeout(() => setSuccessMessage(''), 5000);

    } catch (error) {
        console.error("Error claiming rent:", error);
        setErrorState({
            message: error.message || "Failed to claim rent",
            type: 'transaction'
        });
    } finally {
        const claimButton = document.querySelector('.claimButton');
        if (claimButton) claimButton.disabled = false;
    }
  };

  const calculateTotalRentPayment = useCallback(async () => {
    if (!contract || !params.id) return;

    try {
        const [rentStatus, lateFees] = await Promise.all([
            getRentPeriodStatus(params.id),
            calculateLateFeesFunction(params.id)
        ]);


        if (!property?.rent) {
            return;
        }

        const baseRent = ethers.BigNumber.from(property.rent);
        const fees = ethers.BigNumber.from(lateFees || '0');
        const debt = ethers.BigNumber.from(rentStatus?.totalDebt || '0');

        const total = baseRent.add(fees).add(debt);
        const formattedTotal = ethers.utils.formatEther(total);

        setRentPaymentAmount(formattedTotal);
    } catch (error) {
        console.error('Error calculating rent payment:', error);
        if (property?.rent) {
            setRentPaymentAmount(ethers.utils.formatEther(property.rent));
        }
    }
  }, [contract, params.id, property?.rent, getRentPeriodStatus, calculateLateFeesFunction]);

  useEffect(() => {
    if (property?.rent && contract && !isContractLoading) {
        calculateTotalRentPayment();
    }
  }, [property?.rent, contract, isContractLoading, calculateTotalRentPayment]);

  const handlePayRent = async (e) => {
    e.preventDefault();
    try {
        setError('');
        setIsPayingRent(true);

        if (!address) {
            throw new Error("Please connect your wallet first");
        }

        await payRentFunction({
            propertyId: params.id
        });

        await fetchAllData();
        setSuccessMessage('Rent paid successfully!');

    } catch (error) {
        console.error("Error paying rent:", error);
        if (error.message.includes('Insufficient funds')) {
            setError('You do not have enough funds to cover rent, late fees, and any outstanding debt');
        } else if (error.message.includes('user rejected')) {
            setError('Transaction cancelled');
        } else {
            setError(error.message || "Failed to pay rent");
        }
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

      const newReview = {
        reviewer: address,
        rating: rating,
        comment: comment,
        timestamp: Math.floor(Date.now() / 1000) 
      };

      setReviews(prevReviews => [...prevReviews, newReview]);
      setHasReviewed(true);
      setIsReviewModalOpen(false);

      const updatedReviews = await getPropertyReviewsFunction(params.id);
      if (Array.isArray(updatedReviews)) {
        setReviews(updatedReviews);
      }

    } catch (error) {
      console.error("Error submitting review:", error);
      const updatedReviews = await getPropertyReviewsFunction(params.id);
      if (Array.isArray(updatedReviews)) {
        setReviews(updatedReviews);
        setHasReviewed(false); 
      }
    }
  };


  const handleListShares = async (e) => {
    e.preventDefault();
    try {
        setIsListingShares(true);
        setSellError('');
        setListingSuccess('');

        const numberOfShares = parseInt(sharesToSell);
        if (isNaN(numberOfShares) || numberOfShares <= 0) {
            throw new Error("Number of shares must be greater than 0");
        }

        const priceAsNumber = parseFloat(pricePerShare);
        if (isNaN(priceAsNumber) || priceAsNumber <= 0) {
            throw new Error("Invalid price format");
        }

        await listSharesForSaleFunction(
            params.id,
            numberOfShares,
            pricePerShare
        );

        setPricePerShare('');
        setSharesToSell(1);
        await fetchAllData();
        setListingSuccess(`Successfully listed ${numberOfShares} shares for sale!`);

    } catch (error) {
        console.error("Error listing shares:", error);
        setSellError(error.message || "Failed to list shares");
    } finally {
        setIsListingShares(false);
    }
  };

  const userShares = useMemo(() => {
    if (!shareholdersInfo || !Array.isArray(shareholdersInfo) || shareholdersInfo.length === 0) {
      return 0;
    }
    return shareholdersInfo[0]?.shares ? parseInt(shareholdersInfo[0].shares) : 0;
  }, [shareholdersInfo]);

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
      return ethers.utils.formatEther(property.rent); 
    }
  };

  useEffect(() => {
    if (property) {
      getTotalRequiredAmount().then(amount => {
        setTotalRequiredAmount(amount);
      });
    }
  }, [property]);

  const handleConnect = async () => {
    try {
      await connect();

    } catch (error) {
      console.error("Connection error:", error);
    }
  };

  const handleRemoveProperty = async () => {
    if (!address || property.owner !== address) return;
    
    if (!window.confirm('Are you sure you want to remove this property? This action cannot be undone.')) {
      return;
    }

    setIsRemoving(true);
    try {
      await removePropertyFunction({
        propertyId: params.id
      });

      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setShareholdersInfo([]);
      setProperty(null);
      
      router.replace('/');
      
    } catch (error) {
      console.error("Failed to remove property:", error);
      setIsRemoving(false);
    }
  };


  const renderPaymentButton = () => {
    if (!property?.owner || property.owner !== address) return null;

    const buttonText = isPayingRent 
      ? 'Processing...' 
      : `Pay Rent (${rentPaymentAmount} ETH)`;

    return (
      <button 
        onClick={handlePayRent}
        className={`${styles.actionButton} ${isPayingRent ? styles.disabled : ''}`}
        disabled={isPayingRent || (!rentStatus.isRentDue && property.lastRentPayment !== "0")}
        title={!rentStatus.isRentDue 
          ? 'Rent is not due yet' 
          : `Click to pay rent (${rentPaymentAmount} ETH)`}
      >
        {buttonText}
      </button>
    );
  };

  const Notification = ({ message, type }) => {
    if (!message) return null;

    return (
      <div className={`${styles.notification} ${styles[type]}`}>
        <span>{message}</span>
        <button 
          onClick={() => {
            if (type === 'error') setErrorState({ message: null, type: null });
            if (type === 'success') setSuccessMessage('');
          }}
          className={styles.closeButton}
        >
          ×
        </button>
      </div>
    );
  };

  useEffect(() => {
    const checkRentStatus = async () => {
      if (!contract || !params.id) return;

      try {
        const [isRentDue, rentPeriodStatus] = await Promise.all([
          checkisRentDueFunction(params.id),
          getRentPeriodStatus(params.id)
        ]);

        const currentTimestamp = Math.floor(Date.now() / 1000);
        const isPastDue = rentPeriodStatus.periodEnd > 0 && currentTimestamp > rentPeriodStatus.periodEnd;
        
        setRentStatus({
          isRentDue: isRentDue || isPastDue,
          nextPaymentDate: rentPeriodStatus.periodEnd,
          totalRequired: rentPaymentAmount
        });
      } catch (error) {
        console.error("Error checking rent status:", error);
      }
    };

    if (property?.owner === address) {
      checkRentStatus();
      const intervalId = setInterval(checkRentStatus, 30000);
      return () => clearInterval(intervalId);
    }
  }, [
    contract, 
    params.id, 
    address, 
    property?.owner, 
    checkisRentDueFunction, 
    getRentPeriodStatus, 
    rentPaymentAmount
  ]);

  useEffect(() => {
    const fetchPropertyMessage = async () => {
        try {
            const message = await contract.call('getPropertyMessage', [params.id]);
            setPropertyMessage({
                message: message[0],
                timestamp: message[1] ? new Date(Number(message[1]) * 1000) : null,
                sender: message[2],
                isActive: message[3]
            });
        } catch (error) {
            console.error("Error fetching property message:", error);
        }
    };

    if (contract && params.id) {
        fetchPropertyMessage();
    }
  }, [contract, params.id]);

  const handlePostMessage = async (e) => {
    e.preventDefault();
    setMessageError('');
    setIsPostingMessage(true);

    try {
        await propertyMessageFunction(params.id, newMessage);
        
        setPropertyMessage({
            message: newMessage,
            timestamp: new Date(),
            sender: address,
            isActive: true
        });
        setNewMessage('');
    } catch (error) {
        console.error("Error posting message:", error);
        setMessageError(error.message || 'Failed to post message');
    } finally {
        setIsPostingMessage(false);
    }
  };

  const handleDeleteMessage = async () => {
    try {
        await deletePropertyMessageFunction(params.id);
        setPropertyMessage({
            message: '',
            timestamp: null,
            sender: '',
            isActive: false
        });
    } catch (error) {
        console.error("Error deleting message:", error);
        setMessageError(error.message || 'Failed to delete message');
    }
  };

  useEffect(() => {
    const fetchPropertyMessage = async () => {
        try {
            if (!contract || !params.id) return;
            
            const message = await contract.call('getPropertyMessage', [params.id]);
            setPropertyMessage({
                message: message[0],
                timestamp: message[1] ? new Date(Number(message[1]) * 1000) : null,
                sender: message[2],
                isActive: message[3]
            });
        } catch (error) {
            console.error("Error fetching property message:", error);
        }
    };

    fetchPropertyMessage();
  }, [contract, params.id]);

  useEffect(() => {
    const getContractOwner = async () => {
        try {
            if (contract) {
                const owner = await contract.call('contractOwner');
                setContractOwner(owner);
            }
        } catch (error) {
            console.error("Error fetching contract owner:", error);
        }
    };

    getContractOwner();
  }, [contract]);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const fetchedReviews = await getPropertyReviewsFunction(params.id);
        console.log("Fetched reviews:", fetchedReviews);
        if (Array.isArray(fetchedReviews)) {
          setReviews(fetchedReviews);
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
      }
    };

    if (params.id) {
      fetchReviews();
    }
  }, [params.id, getPropertyReviewsFunction]);

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

  if (errorState.message && dataFetched) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <div className={styles.errorContainer}>
            <h2>Error</h2>
            <p className={styles.errorMessage}>{errorState.message}</p>
            <button 
              onClick={() => {
                setErrorState({ message: null, type: null });
                fetchAllData();
              }}
              className={styles.retryButton}
            >
              Retry
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!property && dataFetched) {
    router.replace('/');
    return null;
  }

  if (!address) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <div className={styles.connectWalletMessage}>
            <h2>Please Connect Your Wallet</h2>
            <button 
              onClick={handleConnect} 
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
      <div className={styles.notificationContainer}>
        <Notification message={errorState.message} type="error" />
        <Notification message={successMessage} type="success" />
      </div>
      
      <div className={styles.container}>
        {errorState.message && errorState.type === 'transaction' && (
          <div className={styles.transactionError}>
            {errorState.message}
            <button 
              onClick={() => setErrorState({ message: null, type: null })}
              className={styles.dismissError}
            >
              ×
            </button>
          </div>
        )}
        
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
                  {renderPaymentButton()}
                  
                  <Link 
                    href={`/update/${property.propertyId}`}
                    className={styles.actionButton}
                  >
                    Update Property
                  </Link>

                  <button 
                    onClick={handleRemoveProperty}
                    className={`${styles.actionButton} ${styles.removeButton}`}
                    disabled={isRemoving || rentPeriodStatus?.isActive}
                    title={rentPeriodStatus?.isActive 
                      ? 'Cannot remove property during active rent period' 
                      : 'Remove this property listing'}
                  >
                    {isRemoving ? 'Removing...' : 'Remove Property'}
                  </button>
                </div>
              )}
            </div>

            {property && (
                <>
                    {(propertyMessage.isActive || 
                      property.owner?.toLowerCase() === address?.toLowerCase() || 
                      contractOwner?.toLowerCase() === address?.toLowerCase()) && (
                        <div className={styles.messageSection}>
                            <h3>Property Message</h3>
                            
                            {(property.owner?.toLowerCase() === address?.toLowerCase() || 
                              contractOwner?.toLowerCase() === address?.toLowerCase()) && (
                                <div className={styles.messageForm}>
                                    <textarea
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Enter a message for property shareholders..."
                                        className={styles.messageInput}
                                        disabled={isPostingMessage}
                                    />
                                    {messageError && (
                                        <div className={styles.error}>{messageError}</div>
                                    )}
                                    <button
                                        onClick={handlePostMessage}
                                        disabled={!newMessage || isPostingMessage}
                                        className={styles.messageButton}
                                    >
                                        {isPostingMessage ? (
                                            <div className={styles.loadingButton}>
                                                <LoadingSpinner />
                                                <span>Posting...</span>
                                            </div>
                                        ) : (
                                            'Post Message'
                                        )}
                                    </button>
                                </div>
                            )}

                            {propertyMessage.isActive && (
                                <div className={styles.currentMessage}>
                                    <div className={styles.messageContent}>
                                        <p className={styles.messageText}>{propertyMessage.message}</p>
                                        <div className={styles.messageMeta}>
                                            <div className={styles.tags}>
                                                {propertyMessage.sender?.toLowerCase() === property?.owner?.toLowerCase() && (
                                                    <span className={`${styles.tag} ${styles.ownerTag}`}>Property Owner</span>
                                                )}
                                                {contractOwner && propertyMessage.sender?.toLowerCase() === contractOwner?.toLowerCase() && (
                                                    <span className={`${styles.tag} ${styles.contractOwnerTag}`}>Contract Owner</span>
                                                )}
                                            </div>
                                            <span className={styles.messageDate}>
                                                Posted: {propertyMessage.timestamp?.toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.messageActions}>
                                        {(property?.owner?.toLowerCase() === address?.toLowerCase() || 
                                          propertyMessage.sender?.toLowerCase() === address?.toLowerCase()) && (
                                            <button
                                                onClick={handleDeleteMessage}
                                                className={styles.deleteButton}
                                            >
                                                Delete Message
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {totalUserShares > 0 && (
              <div className={styles.shareholderSection}>
                <h3>Your Shares</h3>
                <div className={styles.shareholderInfo}>
                  {shareholdersInfo?.length > 0 && address !== property.owner && (
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
                                  : total, 0).toString() || '0'}</span>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.label}>Rent Claimed:</span>
                              <span>
                                {holder.rentClaimed ? formatBigNumber(holder.rentClaimed) : '0'} ETH
                              </span>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.label}>Accrued Rent:</span>
                              <span>
                                {accruedRentInfo?.amount || '0'} ETH
                              </span>
                            </div>
                            {parseFloat(accruedRentInfo?.amount || '0') > 0 && (
                              <button 
                                onClick={handleClaimRent}
                                className={styles.claimButton}
                                disabled={!rentPeriodStatus?.isActive}
                                title={!rentPeriodStatus?.isActive ? 
                                  'Rent period not active' : 
                                  'Click to claim your accrued rent'}
                              >
                                Claim Accrued Rent
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className={styles.reviewsSection}>
              <div className={styles.reviewsHeader}>
                <h3>Property Reviews</h3>
                {!hasReviewed && shareholdersInfo?.[0]?.shares > 0 && (
                  <button 
                    onClick={() => setIsReviewModalOpen(true)}
                    className={styles.reviewButton}
                  >
                    Write a Review
                  </button>
                )}
              </div>
              
              <div style={{display: 'none'}}>
                <p>Reviews array: {JSON.stringify(reviews)}</p>
                <p>Is Array: {Array.isArray(reviews).toString()}</p>
                <p>Length: {reviews?.length}</p>
              </div>
              
              {Array.isArray(reviews) && reviews.length > 0 ? (
                <div className={styles.reviewsGrid}>
                  {reviews.map((review, index) => (
                    <div key={`${review.reviewer}-${review.timestamp}-${index}`} className={styles.reviewCard}>
                      <div className={styles.reviewHeader}>
                        <div className={styles.reviewRating}>
                          {[...Array(5)].map((_, i) => (
                            <span 
                              key={i} 
                              className={`${styles.star} ${i < parseInt(review.rating) ? styles.filled : ''}`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <span className={styles.reviewDate}>
                          {formatBlockchainDate(review.timestamp)}
                        </span>
                      </div>
                      
                      <p className={styles.reviewComment}>{review.comment}</p>
                      
                      <div className={styles.reviewerInfo}>
                        <span className={styles.reviewerAddress}>
                          By: {`${review.reviewer.slice(0, 6)}...${review.reviewer.slice(-4)}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.noReviews}>
                  <p>No reviews yet for this property.</p>
                  {shareholdersInfo?.[0]?.shares > 0 && !hasReviewed && (
                    <p>Be the first to write a review!</p>
                  )}
                </div>
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
                        <span className={styles.label}>Periodic Rent:</span>
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
                      {property?.owner !== address && (
                        <>
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
                        </>
                      )}
                    </div>

                    <div className={styles.detailBox}>
                      <h3>Rent Period Information</h3>
                      {rentPeriodStatus ? (
                        <>
                          <div className={styles.detailItem}>
                            <span className={styles.label}>Period Start:</span>
                            <span>
                              {formatBlockchainDate(rentPeriodStatus.periodStart)}
                            </span>
                          </div>
                          <div className={styles.detailItem}>
                            <span className={styles.label}>Period End:</span>
                            <span>
                              {formatBlockchainDate(rentPeriodStatus.periodEnd)}
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
                    {errorState.message && <div className={styles.errorMessage}>{errorState.message}</div>}
                    {successMessage && <div className={styles.successMessage}>{successMessage}</div>}
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
                    {listingSuccess && <div className={styles.successMessage}>{listingSuccess}</div>}
                    
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

                      <button 
                        type="submit" 
                        className={styles.listButton}
                        disabled={isListingShares}
                      >
                        {isListingShares ? 'Listing Shares...' : 'List Shares for Sale'}
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


