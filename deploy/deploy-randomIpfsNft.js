const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const { storeImages, storeTokenUriMetadata } = require("../utils/uploadToPinata")

const imagesLocation = "images/randomIpfsNft"

const metadataTemplate = {           // STEP -5 ************************************************ STORING METADATA TO IPFS, making the template
    // https://www.npmjs.com/package/@pinata/sdk#hashMetadata-anchor
    name: "",
    description: "",
    image: "",
    attributes: [
        {
            trait_type: "cuteness",
            value: 100,
        },
    ],
}

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = getNamedAccounts()
    const chainId = network.config.chainId

    let vrfCoordinatorV2Address, subscriptionId, tokenUris

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address

        // Now we want to create subscription
        const tx = await vrfCoordinatorV2Mock.createSubscription()
        const txReceipt = await tx.wait(1)

        // we need subcription Id/ subId
        subscriptionId = txReceipt.events[0].args.subId
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2
        subscriptionId = networkConfig[chainId].subscriptionId                // for subscriptionId = https://vrf.chain.link
    }
    log(`-----------------------------------------------------------`)
    await storeImages(imagesLocation)
    const args = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId].gasLane,
        networkConfig[chainId].callbackGasLimit,
        tokenUris,                                       //  we need the array of token URIs
        networkConfig[chainId].mintFee,
    ]


    const randomIpfsNft = await deploy("RandomIpfsNft",{
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1
    })

    log(`--------------------------------------------`)
    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        // Verify
        await verify(randomIpfsNft.address, args) // as verify function takes 2 argument
    }


    /**
     * Uploading our metadata and tokenUris up to the IPFS will give us the list of tokenURIs of these dogs. so,****************************************
     */

    // Get the IPFS hashes of our image
    if (process.env.UPLOAD_TO_PINATA == "true") {         // STEP -2 *****************************
        tokenUris = handleTokenUris()  // tHIS FUNCTION UPLOAD OUR CODE TO PINATA 
    }
}
// we are going to create a function named handleTokenUris() which is going to upload our code to PINATA
async function handleTokenUris() {                      // STEP-3 *******************************************all under this function
    // This function is going to return an array of tokenUris FOR US TO UPLOAD TO SMART CONTRACT, SO WE R GONNA UPLOAD THIS TOKEN URIS TO SMART CONTRACT
    tokenUris = []
    // now we need to do 2 things, first we need to store image in IPFS then we need to store metadata into IPFS
    // storing images into IPFS

    // storing metadata into IPFS       // this "responses" is the array we created in uploadToPinata.js in line 23
    const { responses: imageUploadResponses, files } = await storeImages(imagesLocation) // why this did not give undefined error? where from this came?
    // this responses is the list of the responses[imageUploadResponses] from pinata and this responses are gonna have the hashes of each uploaded files

    // Now we loop through the list and upload each one of uploaded file's metadata
    for (imageUploadResponseIndex in imageUploadResponses) {
        // where from the imageUploadResponseIndex came? we did not define it.
        let tokenUriMetadata = { ...metadataTemplate } // ... is used to say UNPACK
        tokenUriMetadata.name = files[imageUploadResponseIndex].replace(
            ".png",
            ""
        ) /**here basically we are replacing for example .png of pug.png with nothing,
        so in name section it will be just pug */
        tokenUriMetadata.description = `an adorable ${tokenUriMetadata.name} pup`
        tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}` // https://www.npmjs.com/package/@pinata/sdk#pinFileToIPFS-anchor
        // IpfsHash is retured in responses[] by pinFileToIPFS()
        console.log(`uploading ${tokenUriMetadata.name}...`)

        // store the JSON pinata/IPFS
        const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata)
        tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`)
    }
    console.log(`Token URIs uploaded! They are --`)
    console.log(tokenUris)
    return tokenUris
}

module.exports.tags = ["all", "randomIpfs", "main"]

// NFT.Storage
// Pinata


