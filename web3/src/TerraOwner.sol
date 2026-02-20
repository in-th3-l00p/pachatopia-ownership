// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TerraBase.sol";

/**
 * @title TerraOwner
 * @notice Token-owner actions: list and delist terras for sale.
 */
abstract contract TerraOwner is TerraBase {

    /**
     * @notice list a terra for sale. Price must be higher than
     *         the current price floor. First listing can be any price > 0.
     */
    function list(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(price > terras[tokenId].price, "Price can only increase");

        terras[tokenId].price = price;
        terras[tokenId].listed = true;

        emit Listed(tokenId, price);
    }

    /**
     * @notice remove a terra from sale. Price floor is preserved —
     *         relisting must be at a higher price than the last one.
     */
    function delist(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(terras[tokenId].listed, "Not listed");

        terras[tokenId].listed = false;

        emit Delisted(tokenId);
    }
}
