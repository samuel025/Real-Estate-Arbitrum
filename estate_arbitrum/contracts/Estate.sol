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
        require(property.owner == msg.sender, "Not owner");
        
        // Validate inputs
        if (_price == 0 || _rent == 0 || _rentPeriod == 0) 
            revert InvalidAmount();

        // Keep the existing id when updating other fields
        uint256 existingId = property.id;
        
        // Update fields
        property.name = _name;
        property.price = _price;
        property.rent = _rent;
        property.rentPeriod = _rentPeriod;
        property.images = _images;
        property.description = _description;
        property.propertyAddress = _propertyAddress;
        
        // Ensure ID remains unchanged
        property.id = existingId;
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
        Shareholder storage shareholder = shareholders[_propertyId][_shareholder];
        Property storage property = properties[_propertyId];

        // Check if shareholder has any shares (owned or listed)
        uint256 totalShares = getTotalShareholderShares(_propertyId, _shareholder);
        if (totalShares == 0) revert InsufficientShares();
        if (property.rentPool == 0) revert NoRentToClaim();

        require(block.timestamp >= property.currentRentPeriodStart, "Rent period not started");
        require(block.timestamp <= property.currentRentPeriodEnd, "Rent period ended");

        uint256 periodDuration = property.currentRentPeriodEnd - property.currentRentPeriodStart;
        uint256 ownershipDuration = block.timestamp - max(
            property.currentRentPeriodStart, 
            shareholder.lastClaimTimestamp
        );
        
        // Use total shares for percentage calculation
        uint256 shareholderPercentage = (totalShares * PRECISION) / property.totalShares;
        uint256 proratedRent = (property.rentPool * shareholderPercentage * ownershipDuration) 
            / (periodDuration * PRECISION);
        uint256 unclaimedRent = proratedRent - shareholder.rentClaimed;

        if (unclaimedRent == 0) revert NoRentToClaim();

        // Update state
        shareholder.rentClaimed += unclaimedRent;
        property.rentPool -= unclaimedRent;
        shareholder.lastClaimTimestamp = block.timestamp;

        // Transfer rent
        (bool success, ) = _shareholder.call{value: unclaimedRent}("");
        if (!success) revert TransferFailed();

        emit RentClaimed(_propertyId, _shareholder, unclaimedRent);
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
        require(property.owner == _owner, "Not owner");
        
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

    function getShareholderInfo(uint256 _propertyId, address _shareholder) 
        external 
        view 
        propertyExists(_propertyId) 
        returns (
            uint256 shares,
            uint256 rentClaimed,
            uint256 unclaimedRent
        ) {
            Shareholder storage shareholder = shareholders[_propertyId][_shareholder];
            Property storage property = properties[_propertyId];
            
            shares = shareholder.sharesOwned;
            rentClaimed = shareholder.rentClaimed;
            
            uint256 shareholderPercentage = (shareholder.sharesOwned * PRECISION) / property.totalShares;
            uint256 totalEntitledRent = (property.rentPool * shareholderPercentage) / PRECISION;
            unclaimedRent = totalEntitledRent - shareholder.rentClaimed;
            
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
            if (properties[i].isListed && shareholders[i][_shareholder].sharesOwned > 0) {
                count++;
            }
        }
        
        // Create array of correct size
        PropertyInfo[] memory shareholderProperties = new PropertyInfo[](count);
        
        // Fill array with properties where user is shareholder
        uint256 currentIndex = 0;
        for (uint256 i = 1; i < propertyIdCounter; i++) {
            if (properties[i].isListed && shareholders[i][_shareholder].sharesOwned > 0) {
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

    // Add a function to get the current rent period status
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
        
        periodStart = property.lastRentPayment;
        periodEnd = property.lastRentPayment + (property.rentPeriod * SECONDS_PER_DAY);
        isActive = block.timestamp <= periodEnd;
        
        if (isActive) {
            remainingTime = periodEnd - block.timestamp;
        } else {
            remainingTime = 0;
        }
        
        return (periodStart, periodEnd, isActive, remainingTime);
    }

    function listSharesForSale(
        uint256 _propertyId,
        uint256 _shares,
        uint256 _pricePerShare
    ) external propertyExists(_propertyId) {
        Shareholder storage shareholder = shareholders[_propertyId][msg.sender];
        Property storage property = properties[_propertyId];

        // Input validation with safe checks
        if (_shares == 0 || _shares > shareholder.sharesOwned)
            revert InsufficientShares();
        if (_pricePerShare == 0)
            revert InvalidPrice();
        
        // Check for maximum price to prevent overflow
        if (_pricePerShare > type(uint256).max / _shares) 
            revert InvalidPrice();

        // Check for existing listing at same price
        bool foundExisting = false;
        uint256 existingListingId;
        
        for (uint256 i = 0; i < shareListings.length; i++) {
            ShareListing storage listing = shareListings[i];
            if (listing.isActive &&
                listing.propertyId == _propertyId &&
                listing.seller == msg.sender &&
                listing.pricePerShare == _pricePerShare) {
                foundExisting = true;
                existingListingId = i;
                break;
            }
        }

        // Handle unclaimed rent first
        if (block.timestamp <= property.currentRentPeriodEnd && 
            block.timestamp >= property.currentRentPeriodStart) {
            
            uint256 unclaimedRent = calculateUnclaimedRent(_propertyId, msg.sender);
            if (unclaimedRent > 0) {
                shareholder.rentClaimed += unclaimedRent;
                shareholder.lastClaimTimestamp = block.timestamp;
                
                (bool success, ) = msg.sender.call{value: unclaimedRent}("");
                if (!success) revert TransferFailed();
                
                emit RentClaimed(_propertyId, msg.sender, unclaimedRent);
            }
        }

        // Update shareholder's shares
        unchecked {
            shareholder.sharesOwned -= _shares;
        }

        if (foundExisting) {
            // Add shares to existing listing
            ShareListing storage existingListing = shareListings[existingListingId];
            existingListing.numberOfShares += _shares;
            
            emit SharesListed(
                _propertyId,
                existingListingId,
                msg.sender,
                _shares,
                _pricePerShare
            );
        } else {
            // Create new listing
            uint256 newListingId = shareListings.length;
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
        if (_listingId >= shareListings.length || !shareListings[_listingId].isActive)
            revert InvalidListing();

        ShareListing storage listing = shareListings[_listingId];
        Property storage property = properties[listing.propertyId];
        
        // Validate share amount
        if (_sharesToBuy == 0 || _sharesToBuy > listing.numberOfShares)
            revert InsufficientShares();
        
        uint256 totalCost = _sharesToBuy * listing.pricePerShare;
        if (msg.value != totalCost)
            revert InvalidAmount();

        // Calculate platform fee
        uint256 platformFee = (totalCost * PLATFORM_FEE) / BASIS_POINTS;
        uint256 sellerAmount = totalCost - platformFee;

        // Handle rent distribution if in active rent period
        if (block.timestamp <= property.currentRentPeriodEnd && 
            block.timestamp >= property.currentRentPeriodStart) {
            
            uint256 listingDuration = block.timestamp - listing.listingTime;
            uint256 periodDuration = property.currentRentPeriodEnd - property.currentRentPeriodStart;
            uint256 sharePercentage = (_sharesToBuy * PRECISION) / property.totalShares;
            
            uint256 sellerRent = (property.rentPool * sharePercentage * listingDuration) 
                / (periodDuration * PRECISION);
            
            if (sellerRent > 0) {
                property.rentPool -= sellerRent;
                (bool rentSuccess, ) = payable(listing.seller).call{value: sellerRent}("");
                if (!rentSuccess) revert TransferFailed();
                emit RentClaimed(listing.propertyId, listing.seller, sellerRent);
            }

            shareholders[listing.propertyId][msg.sender].lastClaimTimestamp = block.timestamp;
        }

        // Update shares
        shareholders[listing.propertyId][msg.sender].sharesOwned += _sharesToBuy;
        listing.numberOfShares -= _sharesToBuy;

        // Transfer payment to seller
        (bool success, ) = payable(listing.seller).call{value: sellerAmount}("");
        if (!success) revert TransferFailed();

        // Deactivate listing if all shares sold
        if (listing.numberOfShares == 0) {
            listing.isActive = false;
        }

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

    // Add function to cancel individual listing
    function cancelListing(uint256 _listingId) external {
        if (_listingId >= shareListings.length) revert InvalidListing();
        ShareListing storage listing = shareListings[_listingId];
        if (listing.seller != msg.sender) revert NotSeller();
        if (!listing.isActive) revert InvalidListing();

        // Calculate and transfer accumulated rent before cancelling
        if (block.timestamp <= properties[listing.propertyId].currentRentPeriodEnd) {
            uint256 listingDuration = block.timestamp - listing.listingTime;
            uint256 periodDuration = properties[listing.propertyId].currentRentPeriodEnd - properties[listing.propertyId].currentRentPeriodStart;
            uint256 sharePercentage = (listing.numberOfShares * PRECISION) / properties[listing.propertyId].totalShares;
            
            uint256 accumulatedRent = (properties[listing.propertyId].rentPool * sharePercentage * listingDuration) 
                / (periodDuration * PRECISION);
            
            // Transfer accumulated rent to seller
            (bool success, ) = payable(listing.seller).call{value: accumulatedRent}("");
            if (!success) revert TransferFailed();
            
            properties[listing.propertyId].rentPool -= accumulatedRent;
        }

        // Return shares to seller
        shareholders[listing.propertyId][listing.seller].sharesOwned += listing.numberOfShares;
        
        listing.isActive = false;
        emit ListingCancelled(_listingId, listing.seller);
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
        
        if (block.timestamp <= property.currentRentPeriodEnd && 
            block.timestamp >= property.currentRentPeriodStart) {
            
            uint256 periodDuration = property.currentRentPeriodEnd - property.currentRentPeriodStart;
            uint256 ownershipDuration = block.timestamp - max(
                property.currentRentPeriodStart, 
                shareholder.lastClaimTimestamp
            );
            
            // Use total shares (owned + listed)
            uint256 totalShares = getTotalShareholderShares(_propertyId, _shareholder);
            uint256 shareholderPercentage = (totalShares * PRECISION) / property.totalShares;
            uint256 proratedRent = (property.rentPool * shareholderPercentage * ownershipDuration) 
                / (periodDuration * PRECISION);
                
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
        
        if (block.timestamp <= property.currentRentPeriodEnd) {
            return 0;
        }

        uint256 daysLate = (block.timestamp - property.currentRentPeriodEnd) / SECONDS_PER_DAY;
        uint256 lateFeePercentage = daysLate * LATE_FEE_RATE;
        
        // Cap at maximum late fee
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

    function getAccruedRent(uint256 _propertyId, address _shareholder) 
        external 
        view 
        propertyExists(_propertyId) 
        returns (
            uint256 accruedRent,
            uint256 periodStart,
            uint256 periodEnd,
            uint256 lastClaim
        ) 
    {
        Property storage property = properties[_propertyId];
        Shareholder storage shareholder = shareholders[_propertyId][_shareholder];
        
        if (block.timestamp <= property.currentRentPeriodEnd && 
            block.timestamp >= property.currentRentPeriodStart) {
            
            uint256 periodDuration = property.currentRentPeriodEnd - property.currentRentPeriodStart;
            uint256 ownershipDuration = block.timestamp - max(
                property.currentRentPeriodStart, 
                shareholder.lastClaimTimestamp
            );
            
            // Use total shares for percentage calculation
            uint256 totalShares = getTotalShareholderShares(_propertyId, _shareholder);
            uint256 shareholderPercentage = (totalShares * PRECISION) / property.totalShares;
            uint256 proratedRent = (property.rentPool * shareholderPercentage * ownershipDuration) 
                / (periodDuration * PRECISION);
                
            accruedRent = proratedRent - shareholder.rentClaimed;
        } else {
            accruedRent = 0;
        }
        
        periodStart = property.currentRentPeriodStart;
        periodEnd = property.currentRentPeriodEnd;
        lastClaim = shareholder.lastClaimTimestamp;
        
        return (accruedRent, periodStart, periodEnd, lastClaim);
    }

    // Add a function to get total shares (owned + listed)
    function getTotalShareholderShares(uint256 _propertyId, address _shareholder) 
        internal 
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

    function getAllListings() external view returns (ShareListing[] memory) {
        uint256 count = 0;
        // First count active listings
        for (uint256 i = 0; i < shareListings.length; i++) {
            if (shareListings[i].isActive) {
                count++;
            }
        }
        
        ShareListing[] memory activeListings = new ShareListing[](count);
        uint256 currentIndex = 0;
        
        // Fill array with active listings
        for (uint256 i = 0; i < shareListings.length; i++) {
            if (shareListings[i].isActive) {
                activeListings[currentIndex] = shareListings[i];
                currentIndex++;
            }
        }
        
        return activeListings;
    }
}