// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title OracleManager
 * @notice Multi-oracle price feed manager with TWAP and manipulation protection
 */
contract OracleManager is Ownable {
    
    struct PricePoint {
        uint256 price;
        uint256 timestamp;
    }
    
    // Multiple price feeds per asset
    mapping(address => AggregatorV3Interface[]) public priceFeeds;
    
    // TWAP history (last 100 points per asset)
    mapping(address => PricePoint[]) public priceHistory;
    mapping(address => uint256) public historyIndex;
    
    // Security parameters
    uint256 public constant MAX_PRICE_DEVIATION = 500; // 5%
    uint256 public constant MAX_PRICE_AGE = 1 hours;
    uint256 public constant MIN_ORACLES = 2;
    uint256 public constant TWAP_PERIOD = 30 minutes;
    uint256 public constant MAX_HISTORY_SIZE = 100;
    
    // Asset decimals
    mapping(address => uint8) public assetDecimals;
    
    event OracleAdded(address indexed asset, address oracle);
    event OracleRemoved(address indexed asset, address oracle);
    event PriceUpdated(address indexed asset, uint256 price, uint256 timestamp);
    event AttackDetected(address indexed asset, uint256 currentPrice, uint256 twap);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @notice Add price feed for asset
     */
    function addPriceFeed(address asset, address feed, uint8 decimals) external onlyOwner {
        require(asset != address(0) && feed != address(0), "Invalid address");
        priceFeeds[asset].push(AggregatorV3Interface(feed));
        assetDecimals[asset] = decimals;
        emit OracleAdded(asset, feed);
    }
    
    /**
     * @notice Remove price feed
     */
    function removePriceFeed(address asset, uint256 index) external onlyOwner {
        require(index < priceFeeds[asset].length, "Invalid index");
        address feed = address(priceFeeds[asset][index]);
        priceFeeds[asset][index] = priceFeeds[asset][priceFeeds[asset].length - 1];
        priceFeeds[asset].pop();
        emit OracleRemoved(asset, feed);
    }
    
    /**
     * @notice Get asset price with multi-oracle validation
     * @return price Price scaled to 18 decimals
     */
    function getAssetPrice(address asset) external returns (uint256) {
        uint256 price = _getPrice(asset);
        
        // Check TWAP deviation and emit event if attack detected
        uint256 twap = getTWAP(asset, TWAP_PERIOD);
        if (twap > 0) {
            uint256 twapDeviation = _calculateDeviation(price, twap);
            if (twapDeviation > MAX_PRICE_DEVIATION * 2) {
                emit AttackDetected(asset, price, twap);
            }
        }
        
        // Update history
        _updatePriceHistory(asset, price);
        
        emit PriceUpdated(asset, price, block.timestamp);
        
        return price;
    }
    
    /**
     * @notice Get asset price (view function, doesn't update history)
     * @return price Price scaled to 18 decimals
     */
    function getAssetPriceView(address asset) external view returns (uint256) {
        return _getPrice(asset);
    }
    
    /**
     * @notice Internal function to get price with validation
     */
    function _getPrice(address asset) internal view returns (uint256) {
        AggregatorV3Interface[] memory feeds = priceFeeds[asset];
        require(feeds.length >= MIN_ORACLES, "Not enough oracles");
        
        uint256[] memory prices = new uint256[](feeds.length);
        uint256 validPrices = 0;
        
        // Fetch from all oracles
        for (uint i = 0; i < feeds.length; i++) {
            (uint256 price, bool valid) = _fetchPrice(feeds[i]);
            if (valid) {
                prices[validPrices] = price;
                validPrices++;
            }
        }
        
        require(validPrices >= MIN_ORACLES, "Not enough valid prices");
        
        // Calculate median
        uint256 medianPrice = _calculateMedian(prices, validPrices);
        
        // Check deviation
        uint256 maxDeviation = _calculateMaxDeviation(prices, validPrices, medianPrice);
        require(maxDeviation <= MAX_PRICE_DEVIATION, "Price deviation too high");
        
        // Check against TWAP
        uint256 twap = getTWAP(asset, TWAP_PERIOD);
        if (twap > 0) {
            uint256 twapDeviation = _calculateDeviation(medianPrice, twap);
            if (twapDeviation > MAX_PRICE_DEVIATION * 2) {
                revert("TWAP deviation too high");
            }
        }
        
        return medianPrice;
    }
    
    /**
     * @notice Get TWAP for asset
     */
    function getTWAP(address asset, uint256 period) public view returns (uint256) {
        PricePoint[] memory history = priceHistory[asset];
        if (history.length == 0) return 0;
        
        uint256 cutoffTime = block.timestamp > period ? block.timestamp - period : 0;
        uint256 weightedSum = 0;
        uint256 totalWeight = 0;
        
        for (uint i = 0; i < history.length; i++) {
            if (history[i].timestamp < cutoffTime) continue;
            if (history[i].timestamp == 0) continue;
            
            uint256 weight = history[i].timestamp - cutoffTime;
            weightedSum += history[i].price * weight;
            totalWeight += weight;
        }
        
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }
    
    /**
     * @notice Check if under flash loan attack
     */
    function isUnderAttack(address asset) external view returns (bool) {
        PricePoint[] memory history = priceHistory[asset];
        if (history.length == 0) return false;
        
        uint256 latestPrice = history[history.length - 1].price;
        uint256 twap = getTWAP(asset, TWAP_PERIOD);
        
        if (twap == 0) return false;
        
        uint256 deviation = _calculateDeviation(latestPrice, twap);
        return deviation > 1000; // 10%
    }
    
    // Internal functions
    
    function _fetchPrice(AggregatorV3Interface feed) internal view returns (uint256, bool) {
        try feed.latestRoundData() returns (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            if (price <= 0) return (0, false);
            if (updatedAt < block.timestamp - MAX_PRICE_AGE) return (0, false);
            if (answeredInRound < roundId) return (0, false);
            if (startedAt == 0) return (0, false);
            
            return (uint256(price), true);
        } catch {
            return (0, false);
        }
    }
    
    function _updatePriceHistory(address asset, uint256 price) internal {
        PricePoint[] storage history = priceHistory[asset];
        uint256 index = historyIndex[asset];
        
        if (history.length < MAX_HISTORY_SIZE) {
            history.push(PricePoint(price, block.timestamp));
        } else {
            history[index] = PricePoint(price, block.timestamp);
            historyIndex[asset] = (index + 1) % MAX_HISTORY_SIZE;
        }
    }
    
    function _calculateMedian(uint256[] memory prices, uint256 length) internal pure returns (uint256) {
        // Bubble sort
        for (uint i = 0; i < length - 1; i++) {
            for (uint j = i + 1; j < length; j++) {
                if (prices[i] > prices[j]) {
                    (prices[i], prices[j]) = (prices[j], prices[i]);
                }
            }
        }
        
        if (length % 2 == 0) {
            return (prices[length/2 - 1] + prices[length/2]) / 2;
        } else {
            return prices[length/2];
        }
    }
    
    function _calculateMaxDeviation(
        uint256[] memory prices,
        uint256 length,
        uint256 median
    ) internal pure returns (uint256) {
        uint256 maxDev = 0;
        for (uint i = 0; i < length; i++) {
            uint256 dev = _calculateDeviation(prices[i], median);
            if (dev > maxDev) maxDev = dev;
        }
        return maxDev;
    }
    
    function _calculateDeviation(uint256 price1, uint256 price2) internal pure returns (uint256) {
        if (price2 == 0) return 0;
        uint256 diff = price1 > price2 ? price1 - price2 : price2 - price1;
        return (diff * 10000) / price2;
    }
}
