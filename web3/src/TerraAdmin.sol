// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TerraBase.sol";

/**
 * @title TerraAdmin
 * @notice Admin-only minting (single + batch).
 */
abstract contract TerraAdmin is TerraBase {

    function mint(
        int32 lat,
        int32 lng,
        uint32 widthCm,
        uint32 heightCm
    ) external onlyRole(ADMIN_ROLE) returns (uint256) {
        require(widthCm > 0 && heightCm > 0, "Invalid dimensions");

        uint256 id = _nextTokenId++;
        _safeMint(msg.sender, id);

        terras[id] = Terra({
            lat: lat,
            lng: lng,
            widthCm: widthCm,
            heightCm: heightCm,
            listed: false,
            price: 0
        });

        emit TerraCreated(id, lat, lng, widthCm, heightCm);
        return id;
    }

    function mintBatch(
        int32[] calldata lats,
        int32[] calldata lngs,
        uint32[] calldata widths,
        uint32[] calldata heights
    ) external onlyRole(ADMIN_ROLE) {
        require(
            lats.length == lngs.length &&
            lats.length == widths.length &&
            lats.length == heights.length,
            "array length mismatch"
        );

        for (uint256 i = 0; i < lats.length; i++) {
            require(widths[i] > 0 && heights[i] > 0, "invalid dimensions");

            uint256 id = _nextTokenId++;
            _safeMint(msg.sender, id);

            terras[id] = Terra({
                lat: lats[i],
                lng: lngs[i],
                widthCm: widths[i],
                heightCm: heights[i],
                listed: false,
                price: 0
            });

            emit TerraCreated(id, lats[i], lngs[i], widths[i], heights[i]);
        }
    }
}
