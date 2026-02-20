// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TerraAdmin.sol";
import "./TerraOwner.sol";
import "./TerraMarket.sol";

/**
 * @title PachaTerra
 * @notice Decentralized land (tile based) registry.
 */
contract PachaTerra is TerraAdmin, TerraOwner, TerraMarket {
    constructor() ERC721("PachaTerra", "TERRA") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
}
