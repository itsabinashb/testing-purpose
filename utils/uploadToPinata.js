// STEP -4 CREATING STOREIMAGES FUNCTION, to store images to IPFS/pinata ************************************
// This whole script is for uploading store images to pinata

// We will add all of our code for uploading to PINATA here
// pinning file to IPFS using pinata -- https://www.npmjs.com/package/@pinata/sdk#pinFileToIPFS-anchor

const pinataSdk = require("@pinata/sdk")
const path = require("path")
const fs = require("fs")
require("dotenv").config()

const pinataApiKey = process.env.PINATA_API_KEY
const pinataApiSecret = process.env.PINATA_API_SECRET
const pinata = pinataSdk(pinataApiKey, pinataApiSecret)

async function storeImages(imagesFilePath) {        // When we export this into deploy file the storeImages() will be called by "imagesLocation" parameter i.e path of the image files.         
    const fullImagesPath = path.resolve(imagesFilePath) // https://nodejs.org/docs/latest/api/path.html#pathresolvepaths
    //console.log(`fullimages path is ${fullImagesPath}`)
    const files = fs.readdirSync(fullImagesPath)   // we read the entire directory get those in the files.
    //console.log(`files are ${files}`)

    // let's create a array for response from pinata server
    let responses = []

    console.log(`Uploading to PINATA`)

    for (fileIndex in files) {                  // where from the fileIndex came??
        console.log(`Working on ${fileIndex}`)
        /** Now we will create a readStream, since this is an image file we have to create a stream where we stream ALL THE DATA INSIDE OF THESE IMAGES */
        const readableStreamForFile = fs.createReadStream(`${fullImagesPath}/${files[fileIndex]}`)

        /** Now we are going to send it  */
        try {
            // pinFileToIPFS() takes the readableStream of files to uploaded as parameter.************************ this will return IpfsHash, PinSize and Timestamp, so reponse variable
            // will hold these.
            const response = await pinata.pinFileToIPFS(readableStreamForFile) // https://www.npmjs.com/package/@pinata/sdk#pinFileToIPFS-anchor
            responses.push(response)
        } catch (error) {
            console.log(error)
        }
    }
    return {responses, files}  // In responses it gonna return the hash of the files
}

// STEP -6 ***************************************** STORE THE JSON OF METADATA TO IPFS
async function storeTokenUriMetadata(metadata){
    try {
        const response =await pinata.pinJSONToIPFS(metadata)
        return response 
    }catch (error){
        console.log(error)
    }
    return null
}
module.exports = { storeImages, storeTokenUriMetadata }


// We will programatically upload images to pinata. i will point out the steps from start to end.

// *********STEP 1 : UPLOAD THE IMAGES/FILES TO A FOLDER NAMED "IMAGES" IN THE PROJECT ROOT