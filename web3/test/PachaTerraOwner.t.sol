// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PachaTerraTestBase} from "./PachaTerraTestBase.sol";
import {Terra} from "../src/TerraTypes.sol";

contract PachaTerraOwnerTest is PachaTerraTestBase {
    function test_list_success() public {
        uint256 id = terra.mint(10, 20, 100, 200);

        vm.expectEmit(true, false, false, true);
        emit Listed(id, 1 ether);
        terra.list(id, 1 ether);

        Terra memory t = terra.getTerra(id);
        assertTrue(t.listed);
        assertEq(t.price, 1 ether);
        assertTrue(terra.isForSale(id));
    }

    function test_list_revertsForNonOwner() public {
        uint256 id = terra.mint(10, 20, 100, 200);

        vm.prank(alice);
        vm.expectRevert("Not owner");
        terra.list(id, 1 ether);
    }

    function test_list_revertsIfPriceIsZero() public {
        uint256 id = terra.mint(10, 20, 100, 200);

        vm.expectRevert("Price must be > 0");
        terra.list(id, 0);
    }

    function test_list_canRelistAtSameOrLowerPrice() public {
        uint256 id = terra.mint(10, 20, 100, 200);
        terra.list(id, 1 ether);
        terra.delist(id);

        // can relist at same price
        terra.list(id, 1 ether);
        assertEq(terra.getTerra(id).price, 1 ether);

        terra.delist(id);

        // can relist at lower price
        terra.list(id, 0.5 ether);
        assertEq(terra.getTerra(id).price, 0.5 ether);
    }

    function test_delist_success() public {
        uint256 id = terra.mint(10, 20, 100, 200);
        terra.list(id, 1 ether);

        vm.expectEmit(true, false, false, false);
        emit Delisted(id);
        terra.delist(id);

        assertFalse(terra.isForSale(id));
        assertEq(terra.getTerra(id).price, 1 ether);
    }

    function test_delist_revertsForNonOwner() public {
        uint256 id = terra.mint(10, 20, 100, 200);
        terra.list(id, 1 ether);

        vm.prank(alice);
        vm.expectRevert("Not owner");
        terra.delist(id);
    }

    function test_delist_revertsIfNotListed() public {
        uint256 id = terra.mint(10, 20, 100, 200);

        vm.expectRevert("Not listed");
        terra.delist(id);
    }
}
