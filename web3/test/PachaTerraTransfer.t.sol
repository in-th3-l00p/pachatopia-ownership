// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PachaTerraTestBase} from "./PachaTerraTestBase.sol";
import {Terra} from "../src/TerraTypes.sol";

contract PachaTerraTransferTest is PachaTerraTestBase {
    function test_transferFrom_success() public {
        uint256 id = terra.mint(1, 1, 10, 10);

        terra.transferFrom(admin, alice, id);

        assertEq(terra.ownerOf(id), alice);
        assertEq(terra.balanceOf(admin), 0);
        assertEq(terra.balanceOf(alice), 1);
    }

    function test_transferFrom_bypassesMarketplace() public {
        uint256 id = terra.mint(1, 1, 10, 10);
        terra.list(id, 1 ether);

        terra.transferFrom(admin, alice, id);

        assertEq(terra.ownerOf(id), alice);
        Terra memory t = terra.getTerra(id);
        assertTrue(t.listed);
    }

    function test_safeTransferFrom_success() public {
        uint256 id = terra.mint(1, 1, 10, 10);

        terra.safeTransferFrom(admin, alice, id);

        assertEq(terra.ownerOf(id), alice);
    }

    function test_approve_andTransfer() public {
        uint256 id = terra.mint(1, 1, 10, 10);

        terra.approve(alice, id);
        assertEq(terra.getApproved(id), alice);

        vm.prank(alice);
        terra.transferFrom(admin, alice, id);

        assertEq(terra.ownerOf(id), alice);
    }

    function test_setApprovalForAll_andTransfer() public {
        terra.mint(1, 1, 10, 10);
        terra.mint(2, 2, 10, 10);

        terra.setApprovalForAll(alice, true);
        assertTrue(terra.isApprovedForAll(admin, alice));

        vm.prank(alice);
        terra.transferFrom(admin, bob, 0);
        vm.prank(alice);
        terra.transferFrom(admin, bob, 1);

        assertEq(terra.ownerOf(0), bob);
        assertEq(terra.ownerOf(1), bob);
    }

    function test_transferFrom_revertsForNonOwner() public {
        uint256 id = terra.mint(1, 1, 10, 10);

        vm.prank(alice);
        vm.expectRevert();
        terra.transferFrom(admin, alice, id);
    }
}
