// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title MockPriceOracle
 * @notice Mock Chainlink price feed for testing
 */
contract MockPriceOracle is AggregatorV3Interface {
    int256 private _price;
    uint8 private _decimals;
    string private _description;
    uint256 private _version = 1;
    
    uint80 private _roundId = 1;
    
    constructor(int256 initialPrice, uint8 decimals_, string memory description_) {
        _price = initialPrice;
        _decimals = decimals_;
        _description = description_;
    }
    
    function decimals() external view override returns (uint8) {
        return _decimals;
    }
    
    function description() external view override returns (string memory) {
        return _description;
    }
    
    function version() external view override returns (uint256) {
        return _version;
    }
    
    function getRoundData(uint80 _roundId_) external view override returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (
            _roundId_,
            _price,
            block.timestamp,
            block.timestamp,
            _roundId_
        );
    }
    
    function latestRoundData() external view override returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (
            _roundId,
            _price,
            block.timestamp,
            block.timestamp,
            _roundId
        );
    }
    
    // Admin functions for testing
    function setPrice(int256 newPrice) external {
        _price = newPrice;
        _roundId++;
    }
    
    function setDecimals(uint8 newDecimals) external {
        _decimals = newDecimals;
    }
}
