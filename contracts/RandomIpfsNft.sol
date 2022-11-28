// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol"; // Our contract will get some additional functionality from these contracts
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol"; // to get onlyOwner modifier

error RandomIpfsNft__RangeOutOfBounds();
error RandomIpfsNft__needMoreEthSent();
error RandomIpfsNft__transferFailed();

contract RandomIpfsNft is VRFConsumerBaseV2, ERC721URIStorage, Ownable {
    /**
     * Instead of just minting the NFT, when we mint the NFT we will trigger a chainlink VRF, by this we will get a random number, by which we will get a random NFT
      The Nfts are - pug, shiba inu, st. Bernard.
      This will have different raritity
      Pug - super rare
      Shiba inu - sort of rare
      St. bernard -  common
     */

    /**
     * User have to pay to mint the NFT
     * The owner of the contract can withdraw the ETH
     */

    event NftRequested(uint256 indexed requestId, address requester);
    event NftMinted(Breed dogBreed, address minter);

    enum Breed {
        PUG,
        SHIBA_INU,
        ST_BERNERD
    }

    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    uint256 internal immutable i_mintFee;

    /**
     * We want to create a mapping between requestIds so whoever call the requestNft() and the fulfillRandomWords() will be executed then it return the requestId,
     * so that we can say that this request id is belongs to this person, assign the NFT to this person
     */
    mapping(uint256 => address) public s_requestIdToSender;
    uint256 public s_tokenCounter; // the token id for NFT
    uint256 public constant MAX_CHANCE_VALUE = 100;
    string[] internal s_dogTokenURI; // This will be an array of such URIs from which we get the JSON metadata from which we get the URI of the NFTs.

    constructor(
        address vrfCoordinatorV2, // https://docs.chain.link/vrf/v2/subscription/supported-networks#goerli-testnet we have to put the coordinator address for testnet
        uint64 subscriptionId,
        bytes32 gasLane,
        uint32 callbackGasLimit,
        string[3] memory dogTokenURI,
        uint256 mintFee
    ) VRFConsumerBaseV2(vrfCoordinatorV2) ERC721("Random IPFS NFT", "RIN") {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2); // what we did here?
        i_subscriptionId = subscriptionId;
        i_gasLane = gasLane;
        i_callbackGasLimit = callbackGasLimit;
        s_dogTokenURI = dogTokenURI;
        i_mintFee = mintFee; // For paying functionality
    }

    function requestNft() public payable returns (uint256 requestId) {
        // payable because we want buyers to buy NFTs by paying ETH
        /** in order to request nft we are need to call the COORDINATOR.requestRandomWords() where we will pass all this stuff in, for that we have to create
         * a constructor as we did before
         * This requestNft() is same as requestRandomWords() from https://docs.chain.link/vrf/v2/subscription/examples/get-a-random-number contract
         */

        if (msg.value < i_mintFee) {
            // Setting that buyer have to pay enough ETH to buy NFTs.
            revert RandomIpfsNft__needMoreEthSent();
        }
        requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        s_requestIdToSender[requestId] = msg.sender;

        // We emitting a event
        emit NftRequested(requestId, msg.sender);
    }

    function fulfillRandomWords(
        // this function returns requestId, see https://github.com/smartcontractkit/chainlink/blob/develop/contracts/src/v0.8/VRFConsumerBaseV2.sol
        uint256 requestId,
        uint256[] memory randomWords // how the array will work here
    ) internal override {
        address dogOwner = s_requestIdToSender[requestId];
        uint256 newTokenId = s_tokenCounter;

        uint256 moddedRng = randomWords[0] % MAX_CHANCE_VALUE; // here randomWords[0] % MAX_CHANCE_VALUE will return a number between 0-99, if it 10 then
        // it will be Pug and so on.
        Breed dogBreed = getBreedFromModdedRng(moddedRng);

        // Update the s_tokenCounter
        s_tokenCounter = s_tokenCounter + 1;
        _safeMint(dogOwner, newTokenId);

        // This is gonna set tokenURI for us
        _setTokenURI(newTokenId, /* that breed's tokenUri*/ s_dogTokenURI[uint256(dogBreed)]); // Is this "uint256(dogBreed)" give the index number for s_dogTokenURI

        emit NftMinted(dogBreed, dogOwner);
    }

    function getBreedFromModdedRng(uint256 moddedRng) public pure returns (Breed) {
        // Now we will have to make a enum for Breed
        uint256 cumulativeSum = 0;
        uint256[3] memory chanceArray = getChanceArray();
        for (uint256 i = 0; i < chanceArray.length; i++) {
            if (moddedRng >= cumulativeSum && moddedRng < chanceArray[i]) {
                // updated
                Breed(i);
            }
            cumulativeSum = chanceArray[i];

            /**
             * suppose moddedRng =25, cumulativeSum = 0, so in loop for i =0 this condition 'if (moddedRng >= cumulativeSum && moddedRng < cumulativeSum + chanceArray[i])' will be false,
             * but at the end the cumulativeSum becomes 10, so when i=1 the condition will be true because chanceArray[1]=20, so it will return Breed(1) i.e SHIBA_INU.
             */
        }
        revert RandomIpfsNft__RangeOutOfBounds(); // If this function does not return anything revert with this error
    }

    /**
     * How do we actually create this dogs with different rarities? we create a chance array, an array to show the different chances of diffferent dogs,so
     */
    function getChanceArray() public pure returns (uint256[3] memory) {
        // this is gonna return a uint256 size of 3 in memory.
        return [10, 20, MAX_CHANCE_VALUE];
    }

    function withdraw() public onlyOwner {
        //How the onlyOwner will function? because there is no mention of msg.sender
        uint256 amount = address(this).balance; // address(this) - here this means this contract?
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            revert RandomIpfsNft__transferFailed();
        }
    }

    function getMintFee() public view returns (uint256) {
        return i_mintFee;
    }

    function getDogTokenUri(uint256 index) public view returns (string memory) {
        return s_dogTokenURI[index];
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }
}
