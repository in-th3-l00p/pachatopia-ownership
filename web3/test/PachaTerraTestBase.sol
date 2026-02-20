// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {PachaTerra} from "../src/PachaTerra.sol";
import {Terra} from "../src/TerraTypes.sol";
import {IAccessControl} from "@openzeppelin-contracts-5.0.0/access/IAccessControl.sol";
import {IERC721Receiver} from "@openzeppelin-contracts-5.0.0/token/ERC721/IERC721Receiver.sol";

abstract contract PachaTerraTestBase is Test, IERC721Receiver {
    PachaTerra public terra;

    address admin;
    address alice;
    address bob;

    event TerraCreated(uint256 indexed tokenId, int32 lat, int32 lng, uint32 widthCm, uint32 heightCm);
    event Listed(uint256 indexed tokenId, uint256 price);
    event Delisted(uint256 indexed tokenId);
    event TerraBought(uint256 indexed tokenId, address indexed from, address indexed to, uint256 price);

    receive() external payable {}

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
}
