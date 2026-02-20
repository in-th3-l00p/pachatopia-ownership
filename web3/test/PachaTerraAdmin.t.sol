// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PachaTerraTestBase} from "./PachaTerraTestBase.sol";
import {Terra} from "../src/TerraTypes.sol";

contract PachaTerraAdminTest is PachaTerraTestBase {
    function test_mint_success() public {
        uint256 id = terra.mint(10, 20, 100, 200);

        assertEq(id, 0);
        assertEq(terra.ownerOf(0), admin);
        assertEq(terra.totalTerras(), 1);

        Terra memory t = terra.getTerra(0);
        assertEq(t.lat, 10);
        assertEq(t.lng, 20);
        assertEq(t.widthCm, 100);
        assertEq(t.heightCm, 200);
        assertFalse(t.listed);
        assertEq(t.price, 0);
    }

    function test_mint_emitsEvent() public {
        vm.expectEmit(address(terra));
        emit TerraCreated(0, 10, 20, 100, 200);
        terra.mint(10, 20, 100, 200);
    }

    function test_mint_incrementsTokenId() public {
        terra.mint(1, 1, 10, 10);
        terra.mint(2, 2, 10, 10);
        terra.mint(3, 3, 10, 10);
        assertEq(terra.totalTerras(), 3);
    }

    function test_mint_revertsForNonAdmin() public {
        vm.prank(alice);
        vm.expectRevert();
        terra.mint(10, 20, 100, 200);
    }

    function test_mint_revertsForZeroWidth() public {
        vm.expectRevert("Invalid dimensions");
        terra.mint(10, 20, 0, 200);
    }

    function test_mint_revertsForZeroHeight() public {
        vm.expectRevert("Invalid dimensions");
        terra.mint(10, 20, 100, 0);
    }

    function test_mint_negativeCoordinates() public {
        uint256 id = terra.mint(-90, -180, 50, 50);
        Terra memory t = terra.getTerra(id);
        assertEq(t.lat, -90);
        assertEq(t.lng, -180);
    }

    function test_mintBatch_success() public {
        int32[] memory lats = new int32[](3);
        int32[] memory lngs = new int32[](3);
        uint32[] memory widths = new uint32[](3);
        uint32[] memory heights = new uint32[](3);

        for (uint256 i = 0; i < 3; i++) {
            lats[i] = int32(int256(i));
            lngs[i] = int32(int256(i * 10));
            widths[i] = uint32(100 + i);
            heights[i] = uint32(200 + i);
        }

        terra.mintBatch(lats, lngs, widths, heights);

        assertEq(terra.totalTerras(), 3);
        for (uint256 i = 0; i < 3; i++) {
            assertEq(terra.ownerOf(i), admin);
            Terra memory t = terra.getTerra(i);
            assertEq(t.lat, int32(int256(i)));
            assertEq(t.widthCm, uint32(100 + i));
        }
    }

    function test_mintBatch_revertsForNonAdmin() public {
        int32[] memory lats = new int32[](1);
        int32[] memory lngs = new int32[](1);
        uint32[] memory widths = new uint32[](1);
        uint32[] memory heights = new uint32[](1);
        widths[0] = 10;
        heights[0] = 10;

        vm.prank(alice);
        vm.expectRevert();
        terra.mintBatch(lats, lngs, widths, heights);
    }

    function test_mintBatch_revertsForArrayMismatch() public {
        int32[] memory lats = new int32[](2);
        int32[] memory lngs = new int32[](1);
        uint32[] memory widths = new uint32[](2);
        uint32[] memory heights = new uint32[](2);

        vm.expectRevert("array length mismatch");
        terra.mintBatch(lats, lngs, widths, heights);
    }

    function test_mintBatch_revertsForZeroDimension() public {
        int32[] memory lats = new int32[](1);
        int32[] memory lngs = new int32[](1);
        uint32[] memory widths = new uint32[](1);
        uint32[] memory heights = new uint32[](1);
        widths[0] = 0;
        heights[0] = 10;

        vm.expectRevert("invalid dimensions");
        terra.mintBatch(lats, lngs, widths, heights);
    }
}
