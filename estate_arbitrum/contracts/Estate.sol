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
    error InsufficientLiquidity();
    error InvalidLiquidityAmount();

    struct Property {
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

    // State variables
    uint256 public constant SECONDS_PER_DAY = 86400;
    //86400

    mapping(uint256 => Property) public properties;
    mapping(uint256 => mapping(address => Shareholder)) public shareholders;
    mapping(uint256 => Review[]) public propertyReviews;
    mapping(uint256 => mapping(address => bool)) public hasReviewed;

    // for liquidity pool
    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidityProviders;
    uint256 public constant LIQUIDITY_FEE = 25; // 0.25% fee in basis points
    uint256 public constant BASIS_POINTS = 10000;
    
    uint256 public propertyIdCounter = 1;
    uint256 public constant PRECISION = 1e18;

    // Events
    event PropertyListed(uint256 indexed propertyId, address indexed owner, string name, uint256 price, uint256 totalShares);
    event SharesPurchased(uint256 indexed propertyId, address indexed buyer, uint256 shares, uint256 cost);
    event SharesSold(uint256 indexed propertyId, address indexed seller, uint256 shares, uint256 amount);
    event RentPaid(uint256 indexed propertyId, address indexed payer, uint256 amount, uint256 timestamp);
    event RentClaimed(uint256 indexed propertyId, address indexed shareholder, uint256 amount);
    event ReviewSubmitted(uint256 indexed propertyId, address indexed reviewer, uint8 rating);
    event PropertyRemoved(uint256 indexed propertyId, address indexed owner);
    event LiquidityAdded(address indexed provider, uint256 amount);
    event LiquidityRemoved(address indexed provider, uint256 amount);
    event FeesCollected(uint256 amount);


    // Modifiers
    modifier propertyExists(uint256 _propertyId) {
        if (!properties[_propertyId].isListed || _propertyId >= propertyIdCounter) 
            revert PropertyDoesNotExist();
        _;
    }


    function getAllProperties() external view returns (Property[] memory) {
        // Count number of listed properties first
        uint256 listedCount = 0;
        for (uint256 i = 1; i < propertyIdCounter; i++) {
            if (properties[i].isListed) {
                listedCount++;
            }
        }
        
        // Create array of correct size
        Property[] memory allProperties = new Property[](listedCount);
        
        // Fill array with listed properties
        uint256 currentIndex = 0;
        for (uint256 i = 1; i < propertyIdCounter; i++) {
            if (properties[i].isListed) {
                allProperties[currentIndex] = properties[i];
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
        string memory  _description,
        string memory _propertyAddress
    ) external {
        if (_totalShares == 0 || _price == 0 || _rent == 0 || _rentPeriod == 0) 
            revert InvalidAmount();
        
        uint256 propertyId = propertyIdCounter++;
        
        properties[propertyId] = Property({
            name: _name,
            owner: _owner,
            price: _price,
            totalShares: _totalShares,
            availableShares: _totalShares,
            rent: _rent,
            rentPool: 0,
            lastRentPayment: 0,
            rentPeriod: _rentPeriod,
            isListed: true,
            totalRentCollected: 0,
            description: _description,
            images: _images,
            propertyAddress: _propertyAddress
        });

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

        property.name = _name;
        property.price = _price;
        property.rent = _rent;
        property.rentPeriod = _rentPeriod;
        property.images = _images;
        property.description = _description;
        property.propertyAddress = _propertyAddress;
    }

    /**
     * @dev Purchase shares of a property
     */
    /**
 * @dev Purchase shares of a property
 */
function purchaseShares(
    uint256 _propertyId,
    uint256 _shares,
    address _buyer
) external payable propertyExists(_propertyId) {
    Property storage property = properties[_propertyId];

    // Check if the requested shares are available
    if (_shares == 0 || _shares > property.availableShares)
        revert InsufficientShares();

    // Calculate the share price with precision
    uint256 sharePrice = (property.price * PRECISION) / property.totalShares;
    uint256 totalCost = (sharePrice * _shares) / PRECISION;

    // Ensure the buyer has sent enough Ether to cover the cost
    if (msg.value < totalCost)
        revert InvalidAmount();

    // Reduce the available shares of the property
    property.availableShares -= _shares;

    // Update the buyer's shares
    Shareholder storage shareholder = shareholders[_propertyId][_buyer];
    shareholder.sharesOwned += _shares;

    // Calculate the liquidity fee and adjust the payment
    uint256 fee = (totalCost * LIQUIDITY_FEE) / BASIS_POINTS;
    uint256 payment = totalCost - fee;

    // Add fee to the liquidity pool
    totalLiquidity += fee;

    // Transfer the remaining payment to the property owner
    (bool success, ) = property.owner.call{value: payment}("");
    if (!success) revert TransferFailed();

    emit SharesPurchased(_propertyId, _buyer, _shares, totalCost);
}

    /**
     * @dev Sell shares back to the market
    **/     
  
    function sellShares(
        uint256 _propertyId,
        uint256 _shares,
        address _seller
    ) external propertyExists(_propertyId) {
        Shareholder storage shareholder = shareholders[_propertyId][_seller];
        Property storage property = properties[_propertyId];

        if (_shares == 0 || _shares > shareholder.sharesOwned)
            revert InsufficientShares();

        uint256 sharePrice = property.price / property.totalShares;
        uint256 saleValue = sharePrice * _shares;

        // Check if liquidity pool has enough funds
        if (totalLiquidity < saleValue)
            revert InsufficientLiquidity();

        // Update state before transfer
        shareholder.sharesOwned -= _shares;
        property.availableShares += _shares;
        totalLiquidity -= saleValue;

        // Transfer funds to seller
        (bool success, ) = payable(_seller).call{value: saleValue}("");
        if (!success) revert TransferFailed();

        emit SharesSold(_propertyId, _seller, _shares, saleValue);
    }

    /**
     * @dev Add liquidity to the pool
     */
    function addLiquidity() external payable {
        if (msg.value == 0)
            revert InvalidLiquidityAmount();
            
        liquidityProviders[msg.sender] += msg.value;
        totalLiquidity += msg.value;
        
        emit LiquidityAdded(msg.sender, msg.value);
    }

    /**
     * @dev Remove liquidity from the pool
     */
    function removeLiquidity(uint256 _amount) external {
        if (_amount == 0 || _amount > liquidityProviders[msg.sender])
            revert InvalidLiquidityAmount();
            
        if (_amount > totalLiquidity)
            revert InsufficientLiquidity();
            
        liquidityProviders[msg.sender] -= _amount;
        totalLiquidity -= _amount;
        
        (bool success, ) = payable(msg.sender).call{value: _amount}("");
        if (!success) revert TransferFailed();
        
        emit LiquidityRemoved(msg.sender, _amount);
    }

    /**
     * @dev Get liquidity provider's balance
     */
    function getLiquidityBalance(address _provider) external view returns (uint256) {
        return liquidityProviders[_provider];
    }


    /**
     * @dev Pay rent for a property
     */
    function payRent(
        uint256 _propertyId,
        address _payer
    ) external payable propertyExists(_propertyId) {
        Property storage property = properties[_propertyId];

        // Convert days to seconds for timestamp comparison
        if (block.timestamp < property.lastRentPayment + (property.rentPeriod * SECONDS_PER_DAY))
            revert RentAlreadyPaidForPeriod();

        if (msg.value < property.rent)
            revert InvalidAmount();

        property.rentPool += msg.value;
        property.lastRentPayment = block.timestamp;
        property.totalRentCollected += msg.value;

        emit RentPaid(_propertyId, _payer, msg.value, block.timestamp);
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

        if (shareholder.sharesOwned == 0)
            revert InsufficientShares();

        uint256 shareholderPercentage = (shareholder.sharesOwned * PRECISION) / property.totalShares;
        uint256 totalEntitledRent = (property.rentPool * shareholderPercentage) / PRECISION;
        uint256 unclaimedRent = totalEntitledRent - shareholder.rentClaimed;

        if (unclaimedRent == 0)
            revert NoRentToClaim();

        // Update state before transfer
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
        
        if (property.availableShares != property.totalShares)
            revert InsufficientShares();

        property.isListed = false;
        emit PropertyRemoved(_propertyId, _owner);
    }

    // View Functions

    function getProperty(uint256 _propertyId) 
        external 
        view 
        propertyExists(_propertyId) 
        returns (Property memory) 
    {
        return properties[_propertyId];
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
    function getShareholderProperties(address _shareholder) external view returns (Property[] memory) {
        // First count the number of properties where user is shareholder
        uint256 count = 0;
        for (uint256 i = 1; i < propertyIdCounter; i++) {
            if (properties[i].isListed && shareholders[i][_shareholder].sharesOwned > 0) {
                count++;
            }
        }
        
        // Create array of correct size
        Property[] memory shareholderProperties = new Property[](count);
        
        // Fill array with properties where user is shareholder
        uint256 currentIndex = 0;
        for (uint256 i = 1; i < propertyIdCounter; i++) {
            if (properties[i].isListed && shareholders[i][_shareholder].sharesOwned > 0) {
                shareholderProperties[currentIndex] = properties[i];
                currentIndex++;
            }
        }
        
        return shareholderProperties;
    }

    /**
     * @dev Get all properties listed by a specific owner
     */
    function getOwnerProperties(address _owner) external view returns (Property[] memory) {
        // First count the number of properties owned
        uint256 count = 0;
        for (uint256 i = 1; i < propertyIdCounter; i++) {
            if (properties[i].isListed && properties[i].owner == _owner) {
                count++;
            }
        }
        
        // Create array of correct size
        Property[] memory ownerProperties = new Property[](count);
        
        // Fill array with owned properties
        uint256 currentIndex = 0;
        for (uint256 i = 1; i < propertyIdCounter; i++) {
            if (properties[i].isListed && properties[i].owner == _owner) {
                ownerProperties[currentIndex] = properties[i];
                currentIndex++;
            }
        }
        
        return ownerProperties;
    }

    receive() external payable {}
}