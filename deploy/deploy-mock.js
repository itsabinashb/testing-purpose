const { developmentChains } = require("../helper-hardhat-config")

// As we can see in VRFCoordinatorV2Moc.sol conract the constructor takes 2 parameter, 1. base fee and 2. gas price link.
const BASE_FEE = ethers.utils.parseEther("0.25") // 0.25 is the premium, it costs 0.25 links per request. https://docs.chain.link/docs/vrf/v2/direct-funding/supported-networks/
const GAS_PRICE_LINK = 1e9 // calculated value

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    const args = [BASE_FEE, GAS_PRICE_LINK]
    if (developmentChains.includes(network.name)) {
        log(`Local network detected! Deploying...`)
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: args,
        })

        log(`Mocks deployed!`)
        log(`----------------------------------------------------------`)
    }
}

module.exports.tags = ["all", "mocks"]
