// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title RealEstateTokenization
 * @dev Contract for tokenizing real estate properties and managing rent distribution
 */
contract RealEstateTokenization {
    // Custom errors
    error PropertyDoesNotExist();
    error InvalidAmount();
    error InsufficientShares();
    error InsufficientFunds();
    error InvalidRating();
    error RentAlreadyPaidForPeriod();
    error NoRentToClaim();
    error TransferFailed();
    error RentPeriodNotEnded();
    error RentReturnFailed(uint256 propertyId, address owner, uint256 amount);
    error InvalidListing();
    error NotContractOwner();
    error UnclaimedRentExists();
    error InvalidPrice();
    error NotSeller();
    error SameAddress();
    error NotAuthorized();
    error ActiveRentPeriod();
    error SharesStillOwned();

    struct RentPeriod {
        uint256 startTime;
        uint256 endTime;
        uint256 rentAmount;
        bool isPaid;
    }

    struct Property {
        uint256 id;
        string name;
        address payable owner;
        uint256 price;
        uint256 totalShares;
        uint256 availableShares;
        uint256 rent;
        uint256 rentPool;
        uint256 lastRentPayment;
        uint256 rentPeriod;
        bool isListed;
        uint256 totalRentCollected;
        string images;
        string description;
        string propertyAddress;
        uint256 currentRentPeriodStart;
        uint256 currentRentPeriodEnd;
        RentPeriod[] rentPeriods;
        mapping(uint256 => mapping(address => bool)) periodClaimed;
    }

    struct Shareholder {
        uint256 sharesOwned;
        uint256 rentClaimed;
        uint256 lastClaimTimestamp;
    }

    struct Review {
        address reviewer;
        uint8 rating;
        string comment;
        uint256 timestamp;
    }

    struct ShareListing {
        uint256 propertyId;
        address seller;
        uint256 numberOfShares;
        uint256 pricePerShare;
        bool isActive;
        uint256 listingTime;
        uint256 accumulatedRent;
    }

    // State variables
    uint256 public constant SECONDS_PER_DAY = 86400;
    uint256 public constant PLATFORM_FEE = 50; // 0.5% fee in basis points
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant PRECISION = 1e18;
    uint256 public constant LISTING_BUFFER_HOURS = 24; // 24 hour buffer period

    uint256 public propertyIdCounter = 1;
    address public contractOwner;

    mapping(uint256 => Property) public properties;
    mapping(uint256 => mapping(address => Shareholder)) public shareholders;
    mapping(uint256 => Review[]) public propertyReviews;
    mapping(uint256 => mapping(address => bool)) public hasReviewed;

    ShareListing[] public shareListings;
    mapping(address => uint256[]) public userListings;

    // Events
    event PropertyListed(uint256 indexed propertyId, address indexed owner, string name, uint256 price, uint256 totalShares);
    event SharesPurchased(uint256 indexed propertyId, address indexed buyer, uint256 shares, uint256 cost);
    event SharesSold(uint256 indexed propertyId, address indexed seller, uint256 shares, uint256 amount);
    event RentPaid(uint256 indexed propertyId, address indexed payer, uint256 amount, uint256 timestamp);
    event RentClaimed(uint256 indexed propertyId, address indexed shareholder, uint256 amount);
    event ReviewSubmitted(uint256 indexed propertyId, address indexed reviewer, uint8 rating);
    event PropertyRemoved(uint256 indexed propertyId, address indexed owner);
    event UnclaimedRentReturned(uint256 indexed propertyId, address indexed owner, uint256 amount);
    event SharesListed(uint256 indexed propertyId, uint256 indexed listingId, address seller, uint256 shares, uint256 pricePerShare);
    event ListingCancelled(uint256 indexed listingId, address seller);
    event MarketplaceSharesSold(uint256 indexed propertyId, uint256 indexed listingId, address seller, address buyer, uint256 shares, uint256 amount);
    event PlatformFeesWithdrawn(address indexed owner, uint256 amount);
    event ContractOwnerUpdated(address indexed oldOwner, address indexed newOwner);
    event ListingPriceUpdated(uint256 indexed listingId, uint256 newPrice);
    event BatchListingsCancelled(uint256[] listingIds);
    event RentDefaulted(uint256 indexed propertyId, uint256 missedAmount, uint256 timestamp);
    event RentDebtPaid(uint256 indexed propertyId, uint256 amount, uint256 timestamp);
    event PropertyDefaultStatusUpdated(uint256 indexed propertyId, bool isDefaulted);
    // Add these events at the contract level with the other events
    event PropertyUpdated(
        uint256 indexed propertyId,
        string name,
        uint256 price,
        uint256 rent,
        uint256 rentPeriod,
        string images,
        string description,
        string propertyAddress,
        bool isInRentPeriod
    );

    event PropertyFinancialsUpdated(
        uint256 indexed propertyId,
        uint256 oldPrice,
        uint256 newPrice,
        uint256 oldRent,
        uint256 newRent,
        uint256 oldRentPeriod,
        uint256 newRentPeriod
    );

    // Add these state variables
    struct RentStatus {
        uint256 missedPayments;
        uint256 totalDebt;
        bool isDefaulted;
        uint256 lastDefaultTime;
        uint256 lateFees;
    }

    mapping(uint256 => RentStatus) public propertyRentStatus;

    // Add constants for late fees
    uint256 public constant LATE_FEE_RATE = 10; // 0.1% per day in basis points
    uint256 public constant MAX_LATE_FEE = 3000; // Maximum 30% late fee

    // Add a mapping to track rent claimed per period
    mapping(uint256 => mapping(address => mapping(uint256 => uint256))) public periodRentClaimed;

    // Add these at the contract level with other state variables
    struct PropertyMessage {
        string message;
        uint256 timestamp;
        address sender;
        bool isActive;
    }

    mapping(uint256 => PropertyMessage) public propertyMessages;

    // Add these events with other events
    event PropertyMessagePosted(
        uint256 indexed propertyId,
        string message,
        address indexed sender,
        uint256 timestamp
    );

    event PropertyMessageUpdated(
        uint256 indexed propertyId,
        string oldMessage,
        string newMessage,
        address indexed sender,
        uint256 timestamp
    );

    event PropertyMessageDeleted(
        uint256 indexed propertyId,
        address indexed sender,
        uint256 timestamp
    );

    constructor() {
        contractOwner = msg.sender;
    }

    // Modifiers
    modifier onlyOwner() {
        if (msg.sender != contractOwner) revert NotContractOwner();
        _;
    }

    modifier propertyExists(uint256 _propertyId) {
        if (!properties[_propertyId].isListed || _propertyId >= propertyIdCounter) 
            revert PropertyDoesNotExist();
        _;
    }

    // Add this struct for returning property data
    struct PropertyInfo {
        uint256 id;
        string name;
        address payable owner;
        uint256 price;
        uint256 totalShares;
        uint256 availableShares;
        uint256 rent;
        uint256 rentPool;
        uint256 lastRentPayment;
        uint256 rentPeriod;
        bool isListed;
        uint256 totalRentCollected;
        string images;
        string description;
        string propertyAddress;
        uint256 currentRentPeriodStart;
        uint256 currentRentPeriodEnd;
        RentPeriod[] rentPeriods;
    }

    // Modified getAllProperties function
    function getAllProperties() external view returns (PropertyInfo[] memory) {
        uint256 listedCount = 0;
        for (uint256 i = 1; i < propertyIdCounter; i++) {
            if (properties[i].isListed) {
                listedCount++;
            }
        }
        
        PropertyInfo[] memory allProperties = new PropertyInfo[](listedCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 1; i < propertyIdCounter; i++) {
            if (properties[i].isListed) {
                Property storage prop = properties[i];
                allProperties[currentIndex] = PropertyInfo({
                    id: prop.id,
                    name: prop.name,
                    owner: prop.owner,
                    price: prop.price,
                    totalShares: prop.totalShares,
                    availableShares: prop.availableShares,
                    rent: prop.rent,
                    rentPool: prop.rentPool,
                    lastRentPayment: prop.lastRentPayment,
                    rentPeriod: prop.rentPeriod,
                    isListed: prop.isListed,
                    totalRentCollected: prop.totalRentCollected,
                    images: prop.images,
                    description: prop.description,
                    propertyAddress: prop.propertyAddress,
                    currentRentPeriodStart: prop.currentRentPeriodStart,
                    currentRentPeriodEnd: prop.currentRentPeriodEnd,
                    rentPeriods: prop.rentPeriods
                });
                currentIndex++;
            }
        }
        
        return allProperties;
    }
    /**
     * @dev List a new property
     */
    function listProperty(
        address payable _owner,
        string memory _name,
        uint256 _price,
        uint256 _totalShares,
        uint256 _rent,
        uint256 _rentPeriod,
        string memory _images,
        string memory _description,
        string memory _propertyAddress
    ) external {
        if (_totalShares == 0 || _price == 0 || _rent == 0 || _rentPeriod == 0) 
            revert InvalidAmount();
        
        uint256 propertyId = propertyIdCounter++;
        
        Property storage property = properties[propertyId];
        property.id = propertyId;
        property.name = _name;
        property.owner = _owner;
        property.price = _price;
        property.totalShares = _totalShares;
        property.availableShares = _totalShares;
        property.rent = _rent;
        property.rentPeriod = _rentPeriod;
        property.isListed = true;
        property.images = _images;
        property.description = _description;
        property.propertyAddress = _propertyAddress;
        
        // Initialize with inactive period
        property.currentRentPeriodStart = 0;
        property.currentRentPeriodEnd = 0;
        property.lastRentPayment = 0;
        
        // Initialize rent status
        RentStatus storage status = propertyRentStatus[propertyId];
        status.missedPayments = 0;
        status.totalDebt = 0;
        status.isDefaulted = false;
        status.lastDefaultTime = 0;
        status.lateFees = 0;
        
        emit PropertyListed(propertyId, _owner, _name, _price, _totalShares);
    }




function updateProperty(
    uint256 _propertyId,
    string memory _name,
    uint256 _price,
    uint256 _rent,
    uint256 _rentPeriod,
    string memory _images,
    string memory _description,
    string memory _propertyAddress
    ) external propertyExists(_propertyId) {
        Property storage property = properties[_propertyId];
        
        // Only owner can update
        if (msg.sender != property.owner && msg.sender != contractOwner) {
            revert NotAuthorized();
        }
        
        // Check if in active rent period
        bool isInRentPeriod = block.timestamp >= property.currentRentPeriodStart && 
                            block.timestamp <= property.currentRentPeriodEnd;
        
        if (isInRentPeriod) {
            // During rent period, can only update non-financial details
            property.name = _name;
            property.description = _description;
            property.propertyAddress = _propertyAddress;
            property.images = _images;
            
            emit PropertyUpdated(
                _propertyId,
                _name,
                property.price, // Keep existing values for financial parameters
                property.rent,
                property.rentPeriod,
                _images,
                _description,
                _propertyAddress,
                true // isInRentPeriod
            );
        } else {
            // Between rent periods, can update all fields
            if (_price == 0 || _rent == 0 || _rentPeriod == 0) {
                revert InvalidAmount();
            }

            // Store old values for event emission
            uint256 oldPrice = property.price;
            uint256 oldRent = property.rent;
            uint256 oldRentPeriod = property.rentPeriod;

            // Update all fields
            property.name = _name;
            property.price = _price;
            property.rent = _rent;
            property.rentPeriod = _rentPeriod;
            property.images = _images;
            property.description = _description;
            property.propertyAddress = _propertyAddress;
            
            emit PropertyUpdated(
                _propertyId,
                _name,
                _price,
                _rent,
                _rentPeriod,
                _images,
                _description,
                _propertyAddress,
                false // isInRentPeriod
            );

            // Emit event for financial changes
            if (oldPrice != _price || oldRent != _rent || oldRentPeriod != _rentPeriod) {
                emit PropertyFinancialsUpdated(
                    _propertyId,
                    oldPrice,
                    _price,
                    oldRent,
                    _rent,
                    oldRentPeriod,
                    _rentPeriod
                );
            }
        }
    }

    /**
     * @dev Purchase shares of a property
     */
    function purchaseShares(
        uint256 _propertyId,
        uint256 _shares,
        address _buyer
    ) external payable propertyExists(_propertyId) {
        Property storage property = properties[_propertyId];

        if (_shares == 0 || _shares > property.availableShares)
            revert InsufficientShares();

        uint256 sharePrice = (property.price * PRECISION) / property.totalShares;
        uint256 totalCost = (sharePrice * _shares) / PRECISION;

        if (msg.value < totalCost)
            revert InvalidAmount();

        // Calculate platform fee
        uint256 platformFee = (totalCost * PLATFORM_FEE) / BASIS_POINTS;
        uint256 sellerAmount = totalCost - platformFee;

        // If we're in an active rent period, handle rent distribution
        if (block.timestamp >= property.currentRentPeriodStart && 
            block.timestamp <= property.currentRentPeriodEnd) {
            
            // Calculate remaining rent for the period
            uint256 periodDuration = property.currentRentPeriodEnd - property.currentRentPeriodStart;
            uint256 remainingDuration = property.currentRentPeriodEnd - block.timestamp;
            uint256 sharePercentage = (_shares * PRECISION) / property.totalShares;
            
            // Transfer proportional rent from owner's future claims to new shareholder
            uint256 transferredRent = (property.rentPool * sharePercentage * remainingDuration) / (periodDuration * PRECISION);
            property.rentPool -= transferredRent;
            
            // Initialize new shareholder's claim status
            shareholders[_propertyId][_buyer].lastClaimTimestamp = block.timestamp;
            // Create a new rent pool for the transferred shares
            property.rentPool += transferredRent;
        } else {
            // If no active rent period, just set the claim timestamp
            shareholders[_propertyId][_buyer].lastClaimTimestamp = block.timestamp;
        }

        // Update share ownership
        property.availableShares -= _shares;
        shareholders[_propertyId][_buyer].sharesOwned += _shares;

        // Transfer payment to property owner
        (bool success, ) = property.owner.call{value: sellerAmount}("");
        if (!success) revert TransferFailed();

        // Return excess payment if any
        if (msg.value > totalCost) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - totalCost}("");
            if (!refundSuccess) revert TransferFailed();
        }

        emit SharesPurchased(_propertyId, _buyer, _shares, totalCost);
    }  


    /**
     * @dev Pay rent for a property
     */
    function payRent(
        uint256 _propertyId,
        address _payer
    ) external payable propertyExists(_propertyId) {
        Property storage property = properties[_propertyId];
        RentStatus storage status = propertyRentStatus[_propertyId];

        // If previous period has ended, handle unclaimed rent first
        if (property.currentRentPeriodEnd > 0 && 
            block.timestamp > property.currentRentPeriodEnd && 
            property.rentPool > 0) {
            
            // Return unclaimed rent from previous period
            uint256 unclaimedSharePercentage = (property.availableShares * PRECISION) / property.totalShares;
            uint256 unclaimedRent = (property.rentPool * unclaimedSharePercentage) / PRECISION;
            
            if (unclaimedRent > 0) {
                property.rentPool -= unclaimedRent;
                
                (bool success, ) = property.owner.call{value: unclaimedRent}("");
                if (!success) {
                    revert RentReturnFailed(_propertyId, property.owner, unclaimedRent);
                }
                
                emit UnclaimedRentReturned(_propertyId, property.owner, unclaimedRent);
            }
        }

        uint256 lateFees = calculateLateFees(_propertyId);
        uint256 requiredAmount = property.rent + lateFees;
        
        if (status.totalDebt > 0) {
            requiredAmount += status.totalDebt;
        }
        
        if (msg.value < requiredAmount) {
            revert InvalidAmount();
        }

        // Handle debt and late fees
        if (lateFees > 0 || status.totalDebt > 0) {
            uint256 penalties = lateFees + status.totalDebt;
            status.totalDebt = 0;
            status.missedPayments = 0;
            status.isDefaulted = false;
            
            emit RentDebtPaid(_propertyId, penalties, block.timestamp);
            emit PropertyDefaultStatusUpdated(_propertyId, false);
        }

        // Start new period
        property.currentRentPeriodStart = block.timestamp;
        property.currentRentPeriodEnd = block.timestamp + (property.rentPeriod * SECONDS_PER_DAY);
        property.rentPool += property.rent;
        property.lastRentPayment = block.timestamp;

        // Return excess payment if any
        if (msg.value > requiredAmount) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - requiredAmount}("");
            if (!success) revert TransferFailed();
        }

        emit RentPaid(_propertyId, _payer, property.rent, block.timestamp);
    }

    
    /**
     * @dev Claim available rent
     */
    function claimRent(
    uint256 _propertyId,
    address payable _shareholder
    ) external propertyExists(_propertyId) {
        Property storage property = properties[_propertyId];
        Shareholder storage shareholder = shareholders[_propertyId][_shareholder];

        // Check if shareholder has any shares (owned or listed)
        uint256 totalShares = getTotalShareholderShares(_propertyId, _shareholder);
        if (totalShares == 0) revert InsufficientShares();

        // Calculate unclaimed rent from previous period if exists
        uint256 previousPeriodRent = 0;
        if (property.currentRentPeriodStart > 0 && 
            shareholder.lastClaimTimestamp < property.currentRentPeriodStart) {
            
            // Calculate rent from previous period
            uint256 previousPeriodEnd = property.currentRentPeriodStart;
            uint256 previousPeriodStart = previousPeriodEnd - (property.rentPeriod * SECONDS_PER_DAY);
            
            if (shareholder.lastClaimTimestamp < previousPeriodStart) {
                // If never claimed in previous period, get full share
                uint256 shareholderPercentage = (totalShares * PRECISION) / property.totalShares;
                previousPeriodRent = (property.rentPool * shareholderPercentage) / PRECISION;
            } else {
                // Get partial share based on time in previous period
                uint256 timeInPreviousPeriod = previousPeriodEnd - shareholder.lastClaimTimestamp;
                uint256 shareholderPercentage = (totalShares * PRECISION) / property.totalShares;
                uint256 fullPeriodRent = (property.rentPool * shareholderPercentage) / PRECISION;
                previousPeriodRent = (fullPeriodRent * timeInPreviousPeriod) / (property.rentPeriod * SECONDS_PER_DAY);
            }
        }

        // Calculate current period rent
        uint256 currentPeriodRent = 0;
        if (block.timestamp >= property.currentRentPeriodStart && 
            block.timestamp <= property.currentRentPeriodEnd &&
            property.rentPool > 0) {
            
            uint256 periodDuration = property.currentRentPeriodEnd - property.currentRentPeriodStart;
            if (periodDuration > 0) {
                uint256 startTime = max(
                    property.currentRentPeriodStart,
                    shareholder.lastClaimTimestamp
                );
                uint256 ownershipDuration = block.timestamp - startTime;
                
                uint256 shareholderPercentage = (totalShares * PRECISION) / property.totalShares;
                uint256 rentShare = (property.rentPool * shareholderPercentage) / PRECISION;
                currentPeriodRent = (rentShare * ownershipDuration) / periodDuration;
            }
        }

        uint256 totalRentToClaim = previousPeriodRent + currentPeriodRent;
        if (totalRentToClaim == 0) revert NoRentToClaim();

        // Update state
        property.rentPool -= totalRentToClaim;
        shareholder.lastClaimTimestamp = block.timestamp;
        shareholder.rentClaimed += totalRentToClaim;  // Track claimed rent
        property.totalRentCollected += totalRentToClaim;  // Update total rent collected

        // Transfer rent
        (bool success, ) = _shareholder.call{value: totalRentToClaim}("");
        if (!success) revert TransferFailed();

        emit RentClaimed(_propertyId, _shareholder, totalRentToClaim);
    }
    
    /**
     * @dev Submit a review for a property
     */
    function submitReview(
        uint256 _propertyId,
        address _reviewer,
        uint8 _rating,
        string calldata _comment
    ) external propertyExists(_propertyId) {
        if (_rating < 1 || _rating > 5)
            revert InvalidRating();
            
        if (hasReviewed[_propertyId][_reviewer])
            revert InvalidRating();

        propertyReviews[_propertyId].push(Review({
            reviewer: _reviewer,
            rating: _rating,
            comment: _comment,
            timestamp: block.timestamp
        }));

        hasReviewed[_propertyId][_reviewer] = true;
        emit ReviewSubmitted(_propertyId, _reviewer, _rating);
    }

    /**
     * @dev Remove a property listing
     */
    function removeProperty(
        uint256 _propertyId,
        address _owner
    ) external propertyExists(_propertyId) {
        Property storage property = properties[_propertyId];
        // Allow both property owner and contract owner to remove properties
        require(property.owner == _owner || msg.sender == contractOwner, "Not authorized");
        
        // 1. Ensure we're between rent periods (not in active period)
        if (block.timestamp <= property.currentRentPeriodEnd) {
            revert ActiveRentPeriod();
        }

        // 2. Ensure all rent from previous period has been claimed
        if (property.rentPool > 0) {
            revert UnclaimedRentExists();
        }

        // 3. Ensure all shares are with the owner
        if (property.availableShares != property.totalShares) {
            revert SharesStillOwned();
        }

        // 4. Ensure no active listings
        for (uint256 i = 0; i < shareListings.length; i++) {
            if (shareListings[i].propertyId == _propertyId && shareListings[i].isActive) {
                revert("Active listings exist");
            }
        }

        // 5. Remove the property
        property.isListed = false;
        emit PropertyRemoved(_propertyId, _owner);
    }

    // View Functions

    function getProperty(uint256 _propertyId) 
        external 
        view 
        propertyExists(_propertyId) 
        returns (PropertyInfo memory) 
    {
        Property storage prop = properties[_propertyId];
        
        return PropertyInfo({
            id: prop.id,
            name: prop.name,
            owner: prop.owner,
            price: prop.price,
            totalShares: prop.totalShares,
            availableShares: prop.availableShares,
            rent: prop.rent,
            rentPool: prop.rentPool,
            lastRentPayment: prop.lastRentPayment,
            rentPeriod: prop.rentPeriod,
            isListed: prop.isListed,
            totalRentCollected: prop.totalRentCollected,
            images: prop.images,
            description: prop.description,
            propertyAddress: prop.propertyAddress,
            currentRentPeriodStart: prop.currentRentPeriodStart,
            currentRentPeriodEnd: prop.currentRentPeriodEnd,
            rentPeriods: prop.rentPeriods
        });
    }

    function getShareholderInfo(
    uint256 _propertyId, 
    address _shareholder
    ) external view propertyExists(_propertyId) returns (
        uint256 shares,
        uint256 rentClaimed,
        uint256 unclaimedRent
    ) {
        Property storage property = properties[_propertyId];
        Shareholder storage shareholder = shareholders[_propertyId][_shareholder];
        
        // Get total shares (owned + listed)
        shares = getTotalShareholderShares(_propertyId, _shareholder);
        rentClaimed = shareholder.rentClaimed;
        
        // Calculate unclaimed rent using the same logic as getAccruedRent
        if (shares > 0 && property.rentPool > 0) {
            // Calculate previous period rent if unclaimed
            uint256 previousPeriodRent = 0;
            if (property.currentRentPeriodStart > 0 && 
                shareholder.lastClaimTimestamp < property.currentRentPeriodStart) {
                
                uint256 previousPeriodEnd = property.currentRentPeriodStart;
                uint256 previousPeriodStart = previousPeriodEnd - (property.rentPeriod * SECONDS_PER_DAY);
                
                if (shareholder.lastClaimTimestamp < previousPeriodStart) {
                    uint256 shareholderPercentage = (shares * PRECISION) / property.totalShares;
                    previousPeriodRent = (property.rentPool * shareholderPercentage) / PRECISION;
                } else {
                    uint256 timeInPreviousPeriod = previousPeriodEnd - shareholder.lastClaimTimestamp;
                    uint256 shareholderPercentage = (shares * PRECISION) / property.totalShares;
                    uint256 fullPeriodRent = (property.rentPool * shareholderPercentage) / PRECISION;
                    previousPeriodRent = (fullPeriodRent * timeInPreviousPeriod) / (property.rentPeriod * SECONDS_PER_DAY);
                }
            }

            // Calculate current period rent
            uint256 currentPeriodRent = 0;
            if (block.timestamp >= property.currentRentPeriodStart && 
                block.timestamp <= property.currentRentPeriodEnd) {
                
                uint256 periodDuration = property.currentRentPeriodEnd - property.currentRentPeriodStart;
                if (periodDuration > 0) {
                    uint256 startTime = max(
                        property.currentRentPeriodStart,
                        shareholder.lastClaimTimestamp
                    );
                    uint256 ownershipDuration = block.timestamp - startTime;
                    
                    uint256 shareholderPercentage = (shares * PRECISION) / property.totalShares;
                    uint256 rentShare = (property.rentPool * shareholderPercentage) / PRECISION;
                    currentPeriodRent = (rentShare * ownershipDuration) / periodDuration;
                }
            }

            unclaimedRent = previousPeriodRent + currentPeriodRent;
        }

        return (shares, rentClaimed, unclaimedRent);
    }

    function getPropertyReviews(uint256 _propertyId) 
        external 
        view 
        propertyExists(_propertyId) 
        returns (Review[] memory) 
    {
        return propertyReviews[_propertyId];
    }

    function isRentDue(uint256 _propertyId) 
        external 
        view 
        propertyExists(_propertyId) 
        returns (bool) 
    {
        Property storage property = properties[_propertyId];
        // Convert days to seconds for timestamp comparison
        return block.timestamp >= property.lastRentPayment + (property.rentPeriod * SECONDS_PER_DAY);
    }



    /**
     * @dev Get all properties where the given address is a shareholder
     */
    function getShareholderProperties(address _shareholder) external view returns (PropertyInfo[] memory) {
    // First count the number of properties where user is shareholder
        uint256 count = 0;
        for (uint256 i = 1; i < propertyIdCounter; i++) {
            if (properties[i].isListed && getTotalShareholderShares(i, _shareholder) > 0) {
                count++;
            }
        }
        
        // Create array of correct size
        PropertyInfo[] memory shareholderProperties = new PropertyInfo[](count);
        
        // Fill array with properties where user is shareholder
        uint256 currentIndex = 0;
        for (uint256 i = 1; i < propertyIdCounter; i++) {
            if (properties[i].isListed && getTotalShareholderShares(i, _shareholder) > 0) {
                Property storage prop = properties[i];
                shareholderProperties[currentIndex] = PropertyInfo({
                    id: prop.id,
                    name: prop.name,
                    owner: prop.owner,
                    price: prop.price,
                    totalShares: prop.totalShares,
                    availableShares: prop.availableShares,
                    rent: prop.rent,
                    rentPool: prop.rentPool,
                    lastRentPayment: prop.lastRentPayment,
                    rentPeriod: prop.rentPeriod,
                    isListed: prop.isListed,
                    totalRentCollected: prop.totalRentCollected,
                    images: prop.images,
                    description: prop.description,
                    propertyAddress: prop.propertyAddress,
                    currentRentPeriodStart: prop.currentRentPeriodStart,
                    currentRentPeriodEnd: prop.currentRentPeriodEnd,
                    rentPeriods: prop.rentPeriods
                });
                currentIndex++;
            }
        }
        
        return shareholderProperties;
    }


    function getRentPeriodStatus(uint256 _propertyId) 
        external 
        view 
        propertyExists(_propertyId) 
        returns (
            uint256 periodStart,
            uint256 periodEnd,
            bool isActive,
            uint256 remainingTime
        ) 
    {
        Property storage property = properties[_propertyId];
        
        // If no rent has been paid yet, return inactive status
        if (property.lastRentPayment == 0) {
            return (0, 0, false, 0);
        }
        
        periodStart = property.currentRentPeriodStart;
        periodEnd = property.currentRentPeriodEnd;
        isActive = block.timestamp <= periodEnd && block.timestamp >= periodStart;
        
        if (isActive) {
            remainingTime = periodEnd - block.timestamp;
        } else {
            remainingTime = 0;
        }
        
        return (periodStart, periodEnd, isActive, remainingTime);
    }




    /**
     * @dev Get all properties listed by a specific owner
     */
   function getOwnerProperties(address _owner) external view returns (PropertyInfo[] memory) {
        // First count the number of properties owned
        uint256 count = 0;
        for (uint256 i = 1; i < propertyIdCounter; i++) {
            if (properties[i].isListed && properties[i].owner == _owner) {
                count++;
            }
        }
        
        // Create array of correct size
        PropertyInfo[] memory ownerProperties = new PropertyInfo[](count);
        
        // Fill array with owned properties
        uint256 currentIndex = 0;
        for (uint256 i = 1; i < propertyIdCounter; i++) {
            if (properties[i].isListed && properties[i].owner == _owner) {
                Property storage prop = properties[i];
                ownerProperties[currentIndex] = PropertyInfo({
                    id: prop.id,
                    name: prop.name,
                    owner: prop.owner,
                    price: prop.price,
                    totalShares: prop.totalShares,
                    availableShares: prop.availableShares,
                    rent: prop.rent,
                    rentPool: prop.rentPool,
                    lastRentPayment: prop.lastRentPayment,
                    rentPeriod: prop.rentPeriod,
                    isListed: prop.isListed,
                    totalRentCollected: prop.totalRentCollected,
                    images: prop.images,
                    description: prop.description,
                    propertyAddress: prop.propertyAddress,
                    currentRentPeriodStart: prop.currentRentPeriodStart,
                    currentRentPeriodEnd: prop.currentRentPeriodEnd,
                    rentPeriods: prop.rentPeriods
                });
                currentIndex++;
            }
        }
        
        return ownerProperties;
    }

    function listSharesForSale(uint256 _propertyId, uint256 _shares, uint256 _pricePerShare) 
        external 
        propertyExists(_propertyId) 
    {
        // Initial validation
        if (_shares == 0) revert InvalidAmount();
        if (_pricePerShare == 0) revert InvalidPrice();
        
        Shareholder storage shareholder = shareholders[_propertyId][msg.sender];
        
        // Check if user has any shares at all
        if (shareholder.sharesOwned == 0) revert InsufficientShares();

        // Calculate total shares already listed with safe math
        uint256 totalListedShares = 0;
        for (uint256 i = 0; i < shareListings.length; i++) {
            if (shareListings[i].isActive &&
                shareListings[i].propertyId == _propertyId &&
                shareListings[i].seller == msg.sender) {
                
                // Safe addition check
                uint256 newTotal = totalListedShares + shareListings[i].numberOfShares;
                if (newTotal < totalListedShares) revert("Arithmetic overflow");
                totalListedShares = newTotal;
            }
        }

        // Check if user has enough unlisted shares with safe math
        uint256 availableShares = shareholder.sharesOwned;
        if (totalListedShares > availableShares) revert InsufficientShares();
        if (_shares > (availableShares - totalListedShares)) revert InsufficientShares();

        // Check for multiplication overflow in total price calculation
        unchecked {
            if (_pricePerShare > type(uint256).max / _shares) 
                revert InvalidPrice();
        }

        // Safe subtraction for share ownership
        if (_shares > shareholder.sharesOwned) revert InsufficientShares();
        shareholder.sharesOwned -= _shares;

        // Create or update listing
        bool foundExisting = false;
        uint256 existingListingId;
        
        for (uint256 i = 0; i < shareListings.length; i++) {
            if (shareListings[i].isActive &&
                shareListings[i].propertyId == _propertyId &&
                shareListings[i].seller == msg.sender &&
                shareListings[i].pricePerShare == _pricePerShare) {
                foundExisting = true;
                existingListingId = i;
                break;
            }
        }

        if (foundExisting) {
            ShareListing storage existingListing = shareListings[existingListingId];
            // Safe addition check for existing listing
            uint256 newShareAmount = existingListing.numberOfShares + _shares;
            if (newShareAmount < existingListing.numberOfShares) revert("Arithmetic overflow");
            existingListing.numberOfShares = newShareAmount;
            
            emit SharesListed(
                _propertyId,
                existingListingId,
                msg.sender,
                _shares,
                _pricePerShare
            );
        } else {
            uint256 newListingId = shareListings.length;
            // Check for array length overflow
            if (newListingId >= type(uint256).max) revert("Max listings reached");
            
            shareListings.push(ShareListing({
                propertyId: _propertyId,
                seller: msg.sender,
                numberOfShares: _shares,
                pricePerShare: _pricePerShare,
                isActive: true,
                listingTime: block.timestamp,
                accumulatedRent: 0
            }));

            userListings[msg.sender].push(newListingId);

            emit SharesListed(
                _propertyId,
                newListingId,
                msg.sender,
                _shares,
                _pricePerShare
            );
        }
    }

    function buyListedShares(uint256 _listingId, uint256 _sharesToBuy) external payable {
        // 1. Initial validation
        if (_listingId >= shareListings.length) revert InvalidListing();
        
        ShareListing storage listing = shareListings[_listingId];
        if (!listing.isActive) revert InvalidListing();
        if (_sharesToBuy == 0 || _sharesToBuy > listing.numberOfShares) revert InsufficientShares();
                
        // 2. Price validation with overflow check
        unchecked {
            if (listing.pricePerShare > type(uint256).max / _sharesToBuy)
                revert InvalidAmount();
        }
        uint256 totalCost = _sharesToBuy * listing.pricePerShare;

        if (msg.value != totalCost) revert InvalidAmount();

        // 3. Calculate platform fee with safe math
        uint256 platformFee = (totalCost * PLATFORM_FEE) / BASIS_POINTS;
        uint256 sellerAmount = totalCost - platformFee;

        // 4. Force rent claim if seller is selling all their shares
        Property storage property = properties[listing.propertyId];
        if (_sharesToBuy == listing.numberOfShares && 
            block.timestamp >= property.currentRentPeriodStart && 
            block.timestamp <= property.currentRentPeriodEnd) {
            
            uint256 unclaimedRent = calculateUnclaimedRent(listing.propertyId, listing.seller);
            if (unclaimedRent > 0) {
                // Update rent claimed status
                shareholders[listing.propertyId][listing.seller].rentClaimed += unclaimedRent;
                property.rentPool -= unclaimedRent;
                
                // Transfer unclaimed rent to seller
                (bool rentSuccess, ) = payable(listing.seller).call{value: unclaimedRent}("");
                if (!rentSuccess) revert TransferFailed();
                
                // Update last claim timestamp
                shareholders[listing.propertyId][listing.seller].lastClaimTimestamp = block.timestamp;
            }
        }

        // 5. Update share ownership
        // Check if buyer is the property owner
        bool isBuyerPropertyOwner = msg.sender == property.owner;
        
        if (isBuyerPropertyOwner) {
            // If buyer is property owner, add shares back to property's available shares
            property.availableShares += _sharesToBuy;
        } else {
            // Normal case: add shares to buyer's balance
            Shareholder storage buyer = shareholders[listing.propertyId][msg.sender];
            
            // Initialize buyer's claim timestamp if first time buying shares
            if (buyer.sharesOwned == 0) {
                buyer.lastClaimTimestamp = block.timestamp;
            }
            
            buyer.sharesOwned += _sharesToBuy;
        }

        // Update listing
        listing.numberOfShares -= _sharesToBuy;

        // 6. Transfer payment to seller
        (bool success, ) = payable(listing.seller).call{value: sellerAmount}("");
        if (!success) revert TransferFailed();

        // 7. Update listing status
        if (listing.numberOfShares == 0) {
            listing.isActive = false;
        }

        // 8. Emit event with additional parameter for buyback
        emit MarketplaceSharesSold(
            listing.propertyId,
            _listingId,
            listing.seller,
            msg.sender,
            _sharesToBuy,
            totalCost
        );
    }   

    function updateListingPrice(uint256 _listingId, uint256 _newPricePerShare) external {
        if (_listingId >= shareListings.length) revert InvalidListing();
        ShareListing storage listing = shareListings[_listingId];
        if (listing.seller != msg.sender) revert NotSeller();
        if (!listing.isActive) revert InvalidListing();
        if (_newPricePerShare == 0) revert InvalidPrice();

        listing.pricePerShare = _newPricePerShare;
        emit ListingPriceUpdated(_listingId, _newPricePerShare);
    }

    function batchCancelListings(uint256[] calldata _listingIds) external onlyOwner {
        for (uint256 i = 0; i < _listingIds.length; i++) {
            uint256 listingId = _listingIds[i];
            if (listingId < shareListings.length && shareListings[listingId].isActive) {
                ShareListing storage listing = shareListings[listingId];
                shareholders[listing.propertyId][listing.seller].sharesOwned += listing.numberOfShares;
                listing.isActive = false;
                emit ListingCancelled(listingId, listing.seller);
            }
        }
        emit BatchListingsCancelled(_listingIds);
    }

    function getPropertyListings(uint256 _propertyId) external view returns (ShareListing[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < shareListings.length; i++) {
            if (shareListings[i].propertyId == _propertyId && shareListings[i].isActive) {
                count++;
            }
        }
        
        ShareListing[] memory propertyListings = new ShareListing[](count);
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < shareListings.length; i++) {
            if (shareListings[i].propertyId == _propertyId && shareListings[i].isActive) {
                propertyListings[currentIndex] = shareListings[i];
                currentIndex++;
            }
        }
        
        return propertyListings;
    }

    function getListingsByPriceRange(uint256 _minPrice, uint256 _maxPrice) 
        external 
        view 
        returns (ShareListing[] memory) 
    {
        uint256 count = 0;
        for (uint256 i = 0; i < shareListings.length; i++) {
            if (shareListings[i].isActive && 
                shareListings[i].pricePerShare >= _minPrice && 
                shareListings[i].pricePerShare <= _maxPrice) {
                count++;
            }
        }
        
        ShareListing[] memory filteredListings = new ShareListing[](count);
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < shareListings.length; i++) {
            if (shareListings[i].isActive && 
                shareListings[i].pricePerShare >= _minPrice && 
                shareListings[i].pricePerShare <= _maxPrice) {
                filteredListings[currentIndex] = shareListings[i];
                currentIndex++;
            }
        }
        
        return filteredListings;
    }

    function updateContractOwner(address _newOwner) external onlyOwner {
        if (_newOwner == address(0)) revert InvalidListing();
        if (_newOwner == contractOwner) revert SameAddress();
        
        address oldOwner = contractOwner;
        contractOwner = _newOwner;
        emit ContractOwnerUpdated(oldOwner, _newOwner);
    }

    receive() external payable {}

  
    function cancelListing(uint256 _listingId) external {
        // 1. Initial validation
        if (_listingId >= shareListings.length) revert InvalidListing();
        
        ShareListing storage listing = shareListings[_listingId];
        if (!listing.isActive) revert InvalidListing();
        if (listing.seller != msg.sender) revert NotSeller();

        // 2. Return shares to seller's owned balance
        Shareholder storage seller = shareholders[listing.propertyId][msg.sender];
        seller.sharesOwned += listing.numberOfShares;

        // 3. Deactivate listing
        listing.isActive = false;
        listing.numberOfShares = 0;  // Clear shares for gas refund

        // 4. Emit event
        emit ListingCancelled(_listingId, msg.sender);
    }

    // Add function to get user's active listings
    function getUserListings(address _user) external view returns (ShareListing[] memory) {
        uint256[] memory userListingIds = userListings[_user];
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < userListingIds.length; i++) {
            if (shareListings[userListingIds[i]].isActive) {
                activeCount++;
            }
        }
        
        ShareListing[] memory activeListings = new ShareListing[](activeCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < userListingIds.length; i++) {
            if (shareListings[userListingIds[i]].isActive) {
                activeListings[currentIndex] = shareListings[userListingIds[i]];
                currentIndex++;
            }
        }
        
        return activeListings;
    }

    // Add function to withdraw platform fees
    function withdrawPlatformFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = payable(contractOwner).call{value: balance}("");
        if (!success) revert TransferFailed();
        
        emit PlatformFeesWithdrawn(contractOwner, balance);
    }

    // Helper function
    function max(uint256 a, uint256 b) private pure returns (uint256) {
        return a >= b ? a : b;
    }

    function calculateUnclaimedRent(uint256 _propertyId, address _shareholder) 
        internal 
        view 
        returns (uint256) 
    {
        Property storage property = properties[_propertyId];
        Shareholder storage shareholder = shareholders[_propertyId][_shareholder];
        
        // Early returns for edge cases
        if (property.totalShares == 0 || property.rentPool == 0) {
            return 0;
        }
        
        if (block.timestamp <= property.currentRentPeriodEnd && 
            block.timestamp >= property.currentRentPeriodStart) {
            
            // Check for timestamp underflow
            if (property.currentRentPeriodEnd < property.currentRentPeriodStart) {
                return 0;
            }
            
            uint256 periodDuration = property.currentRentPeriodEnd - property.currentRentPeriodStart;
            if (periodDuration == 0) {
                return 0;
            }
            
            // Get total shares (owned + listed) using getTotalShareholderShares
            uint256 totalShares = getTotalShareholderShares(_propertyId, _shareholder);
            if (totalShares == 0) {
                return 0;
            }

            // Calculate ownership duration
            uint256 startTime = max(
                property.currentRentPeriodStart, 
                shareholder.lastClaimTimestamp
            );
            if (block.timestamp < startTime) {
                return 0;
            }
            
            uint256 ownershipDuration = block.timestamp - startTime;
            
            // Safe calculations with overflow checks
            if (totalShares > type(uint256).max / PRECISION) {
                return 0;
            }
            uint256 shareholderPercentage = (totalShares * PRECISION) / property.totalShares;
            
            if (property.rentPool > type(uint256).max / shareholderPercentage) {
                return 0;
            }
            uint256 baseRent = (property.rentPool * shareholderPercentage) / PRECISION;
            
            if (ownershipDuration > periodDuration) {
                ownershipDuration = periodDuration;
            }
            
            if (baseRent > type(uint256).max / ownershipDuration) {
                return 0;
            }
            uint256 proratedRent = (baseRent * ownershipDuration) / periodDuration;
            
            // Safe subtraction for final unclaimed rent calculation
            if (proratedRent <= shareholder.rentClaimed) {
                return 0;
            }
            
            return proratedRent - shareholder.rentClaimed;
        }
        
        return 0;
    }

    function isPeriodClaimed(
        uint256 _propertyId,
        uint256 _periodId,
        address _shareholder
    ) external view returns (bool) {
        return properties[_propertyId].periodClaimed[_periodId][_shareholder];
    }

    // Add function to check rent status
    function checkRentStatus(uint256 _propertyId) external {
        Property storage property = properties[_propertyId];
        RentStatus storage status = propertyRentStatus[_propertyId];
        
        // Check if we're past the rent due date
        if (block.timestamp > property.currentRentPeriodEnd) {
            uint256 timeElapsed = block.timestamp - property.currentRentPeriodEnd;
            uint256 missedPeriods = timeElapsed / (property.rentPeriod * SECONDS_PER_DAY);
            
            if (missedPeriods > 0) {
                status.missedPayments += missedPeriods;
                status.totalDebt += property.rent * missedPeriods;
                status.isDefaulted = true;
                status.lastDefaultTime = block.timestamp;
                
                emit RentDefaulted(
                    _propertyId, 
                    property.rent * missedPeriods, 
                    block.timestamp
                );
                emit PropertyDefaultStatusUpdated(_propertyId, true);
            }
        }
    }

    // Add function to get rent status
    function getRentStatus(uint256 _propertyId) 
        external 
        view 
        returns (
            bool isDefaulted,
            uint256 missedPayments,
            uint256 totalDebt,
            uint256 nextDueDate
        ) 
    {
        Property storage property = properties[_propertyId];
        RentStatus storage status = propertyRentStatus[_propertyId];
        
        return (
            status.isDefaulted,
            status.missedPayments,
            status.totalDebt,
            property.currentRentPeriodEnd
        );
    }

    // Add penalties or restrictions for defaulted properties
    modifier notDefaulted(uint256 _propertyId) {
        if (propertyRentStatus[_propertyId].isDefaulted) {
            revert("Property is in default");
        }
        _;
    }

    function calculateLateFees(uint256 _propertyId) public view returns (uint256) {
        Property storage property = properties[_propertyId];
        
        // No late fees for first payment
        if (property.lastRentPayment == 0) {
            return 0;
        }
        
        // No late fees if within current period
        if (block.timestamp <= property.currentRentPeriodEnd) {
            return 0;
        }
        
        uint256 timeElapsed = block.timestamp - property.currentRentPeriodEnd;
        uint256 daysLate = timeElapsed / SECONDS_PER_DAY;
        
        if (daysLate == 0) {
            return 0;
        }
        
        uint256 lateFeePercentage = (daysLate * LATE_FEE_RATE);
        if (lateFeePercentage > MAX_LATE_FEE) {
            lateFeePercentage = MAX_LATE_FEE;
        }
        
        return (property.rent * lateFeePercentage) / BASIS_POINTS;
    }

    // Add function to return unclaimed rent for unsold shares
    function returnUnclaimedRent(uint256 _propertyId) external propertyExists(_propertyId) {
        Property storage property = properties[_propertyId];
        
        // Ensure rent period has ended
        require(block.timestamp > property.currentRentPeriodEnd, "Rent period not ended");
        
        // Calculate rent for unsold shares
        uint256 unclaimedSharePercentage = (property.availableShares * PRECISION) / property.totalShares;
        uint256 unclaimedRent = (property.rentPool * unclaimedSharePercentage) / PRECISION;
        
        if (unclaimedRent > 0) {
            // Reduce rent pool
            property.rentPool -= unclaimedRent;
            
            // Return unclaimed rent to property owner
            (bool success, ) = property.owner.call{value: unclaimedRent}("");
            if (!success) {
                revert RentReturnFailed(_propertyId, property.owner, unclaimedRent);
            }
            
            emit UnclaimedRentReturned(_propertyId, property.owner, unclaimedRent);
        }
    }

    function getAccruedRent(
    uint256 _propertyId, 
    address _shareholder
    ) external view propertyExists(_propertyId) returns (
        uint256 accruedRent,
        uint256 periodStart,
        uint256 periodEnd,
        uint256 lastClaim
    ) {
        Property storage property = properties[_propertyId];
        Shareholder storage shareholder = shareholders[_propertyId][_shareholder];
        
        periodStart = property.currentRentPeriodStart;
        periodEnd = property.currentRentPeriodEnd;
        lastClaim = shareholder.lastClaimTimestamp;
        
        uint256 totalShares = getTotalShareholderShares(_propertyId, _shareholder);
        if (totalShares == 0 || property.rentPool == 0) {  // Added rentPool check
            return (0, periodStart, periodEnd, lastClaim);
        }

        // Calculate previous period rent if unclaimed
        uint256 previousPeriodRent = 0;
        if (property.currentRentPeriodStart > 0 && 
            shareholder.lastClaimTimestamp < property.currentRentPeriodStart) {
            
            uint256 previousPeriodEnd = property.currentRentPeriodStart;
            uint256 previousPeriodStart = previousPeriodEnd - (property.rentPeriod * SECONDS_PER_DAY);
            
            if (shareholder.lastClaimTimestamp < previousPeriodStart) {
                uint256 shareholderPercentage = (totalShares * PRECISION) / property.totalShares;
                previousPeriodRent = (property.rentPool * shareholderPercentage) / PRECISION;
            } else {
                uint256 timeInPreviousPeriod = previousPeriodEnd - shareholder.lastClaimTimestamp;
                uint256 shareholderPercentage = (totalShares * PRECISION) / property.totalShares;
                uint256 fullPeriodRent = (property.rentPool * shareholderPercentage) / PRECISION;
                previousPeriodRent = (fullPeriodRent * timeInPreviousPeriod) / (property.rentPeriod * SECONDS_PER_DAY);
            }
        }

        // Calculate current period rent
        uint256 currentPeriodRent = 0;
        if (block.timestamp >= property.currentRentPeriodStart &&  // Changed order to match claimRent
            block.timestamp <= property.currentRentPeriodEnd &&
            property.rentPool > 0) {  // Added rentPool check
            
            uint256 periodDuration = property.currentRentPeriodEnd - property.currentRentPeriodStart;
            if (periodDuration > 0) {
                uint256 startTime = max(
                    property.currentRentPeriodStart,
                    shareholder.lastClaimTimestamp
                );
                uint256 ownershipDuration = block.timestamp - startTime;  // Changed variable name
                
                uint256 shareholderPercentage = (totalShares * PRECISION) / property.totalShares;
                uint256 rentShare = (property.rentPool * shareholderPercentage) / PRECISION;
                currentPeriodRent = (rentShare * ownershipDuration) / periodDuration;
            }
        }

        accruedRent = previousPeriodRent + currentPeriodRent;
        return (accruedRent, periodStart, periodEnd, lastClaim);
    }   

    // Add a function to get total shares (owned + listed)
    function getTotalShareholderShares(uint256 _propertyId, address _shareholder) 
        public 
        view 
        returns (uint256) 
    {
        uint256 ownedShares = shareholders[_propertyId][_shareholder].sharesOwned;
        uint256 listedShares = 0;
        
        // Add shares from active listings
        for (uint256 i = 0; i < shareListings.length; i++) {
            if (shareListings[i].isActive && 
                shareListings[i].propertyId == _propertyId && 
                shareListings[i].seller == _shareholder) {
                listedShares += shareListings[i].numberOfShares;
            }
        }
        
        return ownedShares + listedShares;
    }

    function getAllListings() external view returns (ShareListing[] memory, uint256[] memory) {
        uint256 count = 0;
        // First count active listings
        for (uint256 i = 0; i < shareListings.length; i++) {
            if (shareListings[i].isActive) {
                count++;
            }
        }
        
        ShareListing[] memory activeListings = new ShareListing[](count);
        uint256[] memory listingIds = new uint256[](count);
        uint256 currentIndex = 0;
        
        // Fill array with active listings and their IDs
        for (uint256 i = 0; i < shareListings.length; i++) {
            if (shareListings[i].isActive) {
                activeListings[currentIndex] = shareListings[i];
                listingIds[currentIndex] = i;
                currentIndex++;
            }
        }
        
        return (activeListings, listingIds);
    }

    // Add this function to debug listings
    function getListingDetails(uint256 _listingId) external view returns (
        bool exists,
        bool isActive,
        uint256 propertyId,
        address seller,
        uint256 numberOfShares,
        uint256 pricePerShare
    ) {
        if (_listingId >= shareListings.length) {
            return (false, false, 0, address(0), 0, 0);
        }
        
        ShareListing storage listing = shareListings[_listingId];
        return (
            true,
            listing.isActive,
            listing.propertyId,
            listing.seller,
            listing.numberOfShares,
            listing.pricePerShare
        );
    }

    /**
     * @dev Post or update a message for a specific property
     * @param _propertyId The ID of the property
     * @param _message The message to be posted
     */
    function postPropertyMessage(
        uint256 _propertyId,
        string memory _message
    ) external propertyExists(_propertyId) {
        Property storage property = properties[_propertyId];
        
        // Only property owner or contract owner can post messages
        if (msg.sender != property.owner && msg.sender != contractOwner) {
            revert NotAuthorized();
        }

        PropertyMessage storage currentMessage = propertyMessages[_propertyId];
        
        // If there's an existing active message, update it
        if (currentMessage.isActive) {
            string memory oldMessage = currentMessage.message;
            currentMessage.message = _message;
            currentMessage.timestamp = block.timestamp;
            currentMessage.sender = msg.sender;
            
            emit PropertyMessageUpdated(
                _propertyId,
                oldMessage,
                _message,
                msg.sender,
                block.timestamp
            );
        } else {
            // Create new message
            propertyMessages[_propertyId] = PropertyMessage({
                message: _message,
                timestamp: block.timestamp,
                sender: msg.sender,
                isActive: true
            });
            
            emit PropertyMessagePosted(
                _propertyId,
                _message,
                msg.sender,
                block.timestamp
            );
        }
    }

    /**
     * @dev Delete the current message for a property
     * @param _propertyId The ID of the property
     */
    function deletePropertyMessage(
        uint256 _propertyId
    ) external propertyExists(_propertyId) {
        Property storage property = properties[_propertyId];
        PropertyMessage storage message = propertyMessages[_propertyId];
        
        // Only message sender, property owner, or contract owner can delete
        if (msg.sender != message.sender && 
            msg.sender != property.owner && 
            msg.sender != contractOwner) {
            revert NotAuthorized();
        }

        if (!message.isActive) {
            revert("No active message");
        }

        message.isActive = false;
        
        emit PropertyMessageDeleted(
            _propertyId,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @dev Get the current message for a property
     * @param _propertyId The ID of the property
     * @return message The message content
     * @return timestamp When the message was posted/updated
     * @return sender Who posted the message
     * @return isActive Whether the message is active
     */
    function getPropertyMessage(uint256 _propertyId) 
        external 
        view 
        propertyExists(_propertyId) 
        returns (
            string memory message,
            uint256 timestamp,
            address sender,
            bool isActive
        ) 
    {
        PropertyMessage storage propertyMessage = propertyMessages[_propertyId];
        return (
            propertyMessage.message,
            propertyMessage.timestamp,
            propertyMessage.sender,
            propertyMessage.isActive
        );
    }
}