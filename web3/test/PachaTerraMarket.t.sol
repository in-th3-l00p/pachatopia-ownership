// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PachaTerraTestBase} from "./PachaTerraTestBase.sol";
import {Terra} from "../src/TerraTypes.sol";

contract PachaTerraMarketTest is PachaTerraTestBase {
    function test_buy_success() public {
        uint256 id = terra.mint(10, 20, 100, 200);
        terra.list(id, 1 ether);

        uint256 sellerBalBefore = admin.balance;

        vm.prank(alice);
        terra.buy{value: 1 ether}(id);

        assertEq(terra.ownerOf(id), alice);
        assertFalse(terra.isForSale(id));
        assertEq(admin.balance, sellerBalBefore + 1 ether);
    }

    function test_buy_revertsIfNotListed() public {
        uint256 id = terra.mint(10, 20, 100, 200);

        vm.prank(alice);
        vm.expectRevert("Not for sale");
        terra.buy{value: 1 ether}(id);
    }

    function test_buy_revertsIfWrongEthAmount() public {
        uint256 id = terra.mint(10, 20, 100, 200);
        terra.list(id, 1 ether);

        vm.prank(alice);
        vm.expectRevert("Wrong ETH amount");
        terra.buy{value: 0.5 ether}(id);
    }

    function test_buy_revertsIfBuyerIsOwner() public {
        uint256 id = terra.mint(10, 20, 100, 200);
        terra.list(id, 1 ether);

        vm.expectRevert("Already own this");
        terra.buy{value: 1 ether}(id);
    }

    function test_buy_clearsListingPreservesPrice() public {
        uint256 id = terra.mint(10, 20, 100, 200);
        terra.list(id, 1 ether);

        vm.prank(alice);
        terra.buy{value: 1 ether}(id);

        Terra memory t = terra.getTerra(id);
        assertFalse(t.listed);
        assertEq(t.price, 1 ether);
    }

    function test_buy_newOwnerCanRelistHigher() public {
        uint256 id = terra.mint(10, 20, 100, 200);
        terra.list(id, 1 ether);

        vm.prank(alice);
        terra.buy{value: 1 ether}(id);

        vm.prank(alice);
        terra.list(id, 2 ether);

        uint256 aliceBalBefore = alice.balance;
        vm.prank(bob);
        terra.buy{value: 2 ether}(id);

        assertEq(terra.ownerOf(id), bob);
        assertEq(alice.balance, aliceBalBefore + 2 ether);
    }
}
