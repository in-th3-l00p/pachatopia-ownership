// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin-contracts-5.0.0/token/ERC721/ERC721.sol";
import "@openzeppelin-contracts-5.0.0/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin-contracts-5.0.0/access/AccessControl.sol";
import "@openzeppelin-contracts-5.0.0/utils/ReentrancyGuard.sol";
import "./TerraTypes.sol";

/**
 * @title TerraBase
 * @notice Shared storage, events, view helpers, and ERC-721 overrides.
 */
abstract contract TerraBase is
    ERC721,
    ERC721Enumerable,
    AccessControl,
    ReentrancyGuard
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    mapping(uint256 => Terra) public terras;
    uint256 internal _nextTokenId;

    event TerraCreated(uint256 indexed tokenId, int32 lat, int32 lng, uint32 widthCm, uint32 heightCm);
    event Listed(uint256 indexed tokenId, uint256 price);
    event Delisted(uint256 indexed tokenId);
    event TerraBought(uint256 indexed tokenId, address indexed from, address indexed to, uint256 price);

    // ── view helpers ─────────────────────────────────────────────

    function getTerra(uint256 tokenId) external view returns (Terra memory) {
        require(terras[tokenId].widthCm > 0, "Terra does not exist");
        return terras[tokenId];
    }

    function terrasOf(address owner) external view returns (uint256[] memory) {
        uint256 count = balanceOf(owner);
        uint256[] memory ids = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            ids[i] = tokenOfOwnerByIndex(owner, i);
        }
        return ids;
    }

    function totalTerras() external view returns (uint256) {
        return _nextTokenId;
    }

    function isForSale(uint256 tokenId) external view returns (bool) {
        return terras[tokenId].listed;
    }

    // ── ERC-721 overrides ────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }
}
