// SPDX-License-Identifier: MIT
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

pragma solidity 0.8.17;

contract BasicNft is ERC721 {
    string public constant TOKEN_URI =
        "ipfs://bafybeig37ioir76s7mg5oobetncojcm3c3hxasyd4rvid4jqhy4gkaheg4/?filename=0-PUG.json";
    uint256 private s_tokenCounter; // the token id

    constructor() ERC721("Dogie", "DOG") {
        s_tokenCounter = 0;
    }

    // In order to create new token the @openzeppelin contract comes with a _mint()
    function mintNft() public returns (uint256) {
        _safeMint(msg.sender, s_tokenCounter); // "to" is who is gonna own this nft, in this case the msg.sender
        s_tokenCounter += 1; // because token id must be unique
        return s_tokenCounter;
    }

    function tokenURI(uint256) public view override returns(string memory){  
        return TOKEN_URI;
    }

    function getTokenId() public view returns (uint256) {
        return s_tokenCounter;
    }
}

// Now let's create deploy script for this