// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TerraBase.sol";

/**
 * @title TerraMarket
 * @notice Public marketplace: anyone can buy a listed terra.
 */
abstract contract TerraMarket is TerraBase {

    /**
     * @notice buy a listed terra at its asking price.
     *         ETH goes directly to the seller. Listing is cleared on transfer.
     */
    function buy(uint256 tokenId) external payable nonReentrant {
        Terra storage t = terras[tokenId];
        require(t.listed, "Not for sale");
        require(msg.value == t.price, "Wrong ETH amount");

        address seller = ownerOf(tokenId);
        require(seller != msg.sender, "Already own this");

        t.listed = false;

        _transfer(seller, msg.sender, tokenId);

        (bool sent,) = seller.call{value: msg.value}("");
        require(sent, "ETH transfer failed");

        emit TerraBought(tokenId, seller, msg.sender, msg.value);
    }
}
