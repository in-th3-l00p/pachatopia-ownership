// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

struct Terra {
    int32 lat;
    int32 lng;
    uint32 widthCm;
    uint32 heightCm;
    bool listed;        // true = for sale
    uint256 price;      // asking price in wei, only goes up
}
