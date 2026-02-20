// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {PachaTerra} from "../src/PachaTerra.sol";
import {Terra} from "../src/TerraTypes.sol";
import {IAccessControl} from "@openzeppelin-contracts-5.0.0/access/IAccessControl.sol";
import {IERC721Receiver} from "@openzeppelin-contracts-5.0.0/token/ERC721/IERC721Receiver.sol";

contract PachaTerraTest is Test, IERC721Receiver {
    PachaTerra public terra;

    address admin;
    address alice;
    address bob;

    event TerraCreated(uint256 indexed tokenId, int32 lat, int32 lng, uint32 widthCm, uint32 heightCm);
    event Listed(uint256 indexed tokenId, uint256 price);
    event Delisted(uint256 indexed tokenId);
    event TerraBought(uint256 indexed tokenId, address indexed from, address indexed to, uint256 price);

    // allow test contract to receive ETH from buy() sales
    receive() external payable {}

    // required so _safeMint can send tokens to this test contract
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function setUp() public {
        admin = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        terra = new PachaTerra();

        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }

    // ─── constructor ─────────────────────────────────────────────

    function test_constructor_setsNameAndSymbol() public view {
        assertEq(terra.name(), "PachaTerra");
        assertEq(terra.symbol(), "TERRA");
    }

    function test_constructor_grantsRoles() public view {
        assertTrue(terra.hasRole(terra.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(terra.hasRole(terra.ADMIN_ROLE(), admin));
    }

    // ─── mint ────────────────────────────────────────────────────

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

    // ─── mintBatch ───────────────────────────────────────────────

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

    // ─── list ────────────────────────────────────────────────────

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

    function test_list_revertsIfPriceNotHigher() public {
        uint256 id = terra.mint(10, 20, 100, 200);
        terra.list(id, 1 ether);
        terra.delist(id);

        vm.expectRevert("Price can only increase");
        terra.list(id, 1 ether);
    }

    function test_list_priceFloorAfterDelist() public {
        uint256 id = terra.mint(10, 20, 100, 200);
        terra.list(id, 1 ether);
        terra.delist(id);

        terra.list(id, 2 ether);
        assertEq(terra.getTerra(id).price, 2 ether);
    }

    // ─── delist ──────────────────────────────────────────────────

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

    // ─── buy ─────────────────────────────────────────────────────

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

    // ─── views ───────────────────────────────────────────────────

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

    // ─── ERC-721 ─────────────────────────────────────────────────

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

    // ─── access control ──────────────────────────────────────────

    function test_adminCanGrantRole() public {
        terra.grantRole(terra.ADMIN_ROLE(), alice);
        assertTrue(terra.hasRole(terra.ADMIN_ROLE(), alice));

        vm.prank(alice);
        terra.mint(1, 1, 10, 10);
        assertEq(terra.ownerOf(0), alice);
    }

    function test_nonAdminCannotGrantRole() public {
        // cache role values before vm.expectRevert so the view calls
        // aren't consumed by the cheatcode
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
