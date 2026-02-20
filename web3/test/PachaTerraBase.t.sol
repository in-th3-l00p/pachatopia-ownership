// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PachaTerraTestBase} from "./PachaTerraTestBase.sol";
import {IAccessControl} from "@openzeppelin-contracts-5.0.0/access/IAccessControl.sol";

contract PachaTerraBaseTest is PachaTerraTestBase {
    function test_constructor_setsNameAndSymbol() public view {
        assertEq(terra.name(), "PachaTerra");
        assertEq(terra.symbol(), "TERRA");
    }

    function test_constructor_grantsRoles() public view {
        assertTrue(terra.hasRole(terra.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(terra.hasRole(terra.ADMIN_ROLE(), admin));
    }

    function test_getTerra_revertsForNonExistent() public {
        vm.expectRevert("Terra does not exist");
        terra.getTerra(999);
    }

    function test_terrasOf_returnsOwnerTokens() public {
        terra.mint(1, 1, 10, 10);
        terra.mint(2, 2, 10, 10);
        terra.mint(3, 3, 10, 10);

        uint256[] memory ids = terra.terrasOf(admin);
        assertEq(ids.length, 3);
        assertEq(ids[0], 0);
        assertEq(ids[1], 1);
        assertEq(ids[2], 2);
    }

    function test_terrasOf_emptyForNonHolder() public view {
        uint256[] memory ids = terra.terrasOf(alice);
        assertEq(ids.length, 0);
    }

    function test_terrasOf_updatesAfterTransfer() public {
        uint256 id = terra.mint(1, 1, 10, 10);
        terra.list(id, 1 ether);

        vm.prank(alice);
        terra.buy{value: 1 ether}(id);

        assertEq(terra.terrasOf(admin).length, 0);
        assertEq(terra.terrasOf(alice).length, 1);
        assertEq(terra.terrasOf(alice)[0], id);
    }

    function test_isForSale_falseByDefault() public {
        uint256 id = terra.mint(1, 1, 10, 10);
        assertFalse(terra.isForSale(id));
    }

    function test_totalTerras_startsAtZero() public view {
        assertEq(terra.totalTerras(), 0);
    }

    function test_supportsInterface_ERC721() public view {
        assertTrue(terra.supportsInterface(0x80ac58cd));
    }

    function test_supportsInterface_ERC721Enumerable() public view {
        assertTrue(terra.supportsInterface(0x780e9d63));
    }

    function test_supportsInterface_AccessControl() public view {
        assertTrue(terra.supportsInterface(0x7965db0b));
    }

    function test_enumerable_totalSupply() public {
        terra.mint(1, 1, 10, 10);
        terra.mint(2, 2, 10, 10);
        assertEq(terra.totalSupply(), 2);
    }

    function test_enumerable_tokenByIndex() public {
        terra.mint(1, 1, 10, 10);
        terra.mint(2, 2, 10, 10);
        assertEq(terra.tokenByIndex(0), 0);
        assertEq(terra.tokenByIndex(1), 1);
    }

    function test_adminCanGrantRole() public {
        terra.grantRole(terra.ADMIN_ROLE(), alice);
        assertTrue(terra.hasRole(terra.ADMIN_ROLE(), alice));

        vm.prank(alice);
        terra.mint(1, 1, 10, 10);
        assertEq(terra.ownerOf(0), alice);
    }

    function test_nonAdminCannotGrantRole() public {
        bytes32 adminRole = terra.ADMIN_ROLE();
        bytes32 defaultAdminRole = terra.DEFAULT_ADMIN_ROLE();

        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                alice,
                defaultAdminRole
            )
        );
        vm.prank(alice);
        terra.grantRole(adminRole, bob);
    }
}
