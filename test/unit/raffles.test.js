const {assert, expect} = require("chai")
const { network, deployments, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name) ? describe.skip : describe("Raffles", () => {

    let raffles, vrfCoordinator, deployer, chainId, fee, interval
    beforeEach(async() => {
        accounts = await ethers.getSigners()
        chainId = network.config.chainId
        deployer = accounts[0]
        await deployments.fixture(["all"])
        raffles = await ethers.getContract("Raffles")
        vrfCoordinator = await ethers.getContract("VRFCoordinatorV2Mock")
        fee = await raffles.getFee()
        interval = await raffles.getInterval()
    })

    describe("Constructor", () => {

        it("Sets Value correctly", async() => {
            const keyHash = await raffles.getKeyHash()
            assert.equal(keyHash.toString(), networkConfig[chainId].keyHash)
            const callBackGasLimit = await raffles.getCallBackGasLimit()
            assert.equal(callBackGasLimit.toString(), networkConfig[chainId].callBackGasLimit)
            const fee = await raffles.getFee()
            assert.equal(fee.toString(), networkConfig[chainId].fee)
            const raffleState = await raffles.getRaffleState()
            assert.equal(raffleState.toString(), "0")
            assert.equal(interval.toString(), networkConfig[chainId].interval)
        })
    })

    describe("enterRaffles", () => {
        it("Reverts if no ETH is sent", async() => {
            await expect(raffles.enterRaffles()).to.be.revertedWith("Raffles__NotEnoughETH")
        })
        it("Reverts if less ETH is sent", async() => {
            await expect(raffles.enterRaffles({value: ethers.utils.parseEther("0.001")})).to.be.revertedWith("Raffles__NotEnoughETH")
        })
        it("Emits event player enters", async() => {
            await expect(raffles.enterRaffles({value: fee.toString()})).to.emit(raffles, "RafflesEnter")
        })
        it("Saves Players", async() => {
            await expect(raffles.enterRaffles({value: fee.toString()})).to.emit(raffles, "RafflesEnter")
            const player = await raffles.getPlayer("0")
            assert.equal(player.toString(), deployer.address)
        })

        it("Reverts if raffles is in CALCULATING state", async() => {
            await raffles.enterRaffles({value: fee.toString()})
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.request({method: "evm_mine", params: []})
            await raffles.performUpkeep([])
            await expect(raffles.enterRaffles({value: fee.toString()})).to.be.revertedWith("Raffles__LotteryNotOpen") 
        })
    })

    describe("checkUpkeep", async() => {
        it("Returns true if player has entered, raffles is open and enough time has passed", async() => {
            await raffles.enterRaffles({value: fee.toString()})
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.request({method: "evm_mine", params: []})
            const {upkeepNeeded} = await raffles.checkUpkeep("0x")
            assert(upkeepNeeded)
        })

        it("Returns false if player hasnt entered in lottery", async() => {
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.request({method: "evm_mine", params: []})
            const {upkeepNeeded} = await raffles.checkUpkeep("0x")
            assert(!upkeepNeeded)
        }) 

        it("Returns false if not enough time hasnt passed in lottery", async() => {
            await raffles.enterRaffles({value: fee.toString()})
            await network.provider.send("evm_increaseTime", [interval.toNumber() - 5])
            await network.provider.request({method: "evm_mine", params: []})
            const {upkeepNeeded} = await raffles.checkUpkeep("0x")
            assert(!upkeepNeeded)
        }) 

        it("Returns false if raffles is in CALCULATING stage", async() => {
            await raffles.enterRaffles({value: fee.toString()})
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.request({method: "evm_mine", params: []})
            await raffles.performUpkeep([])
            const {upkeepNeeded} = await raffles.checkUpkeep("0x")
            assert(!upkeepNeeded)
        }) 
    })

    describe("performUpkeep", () => {
        it("Revertes if checkUpkeep is false", async() => {
            await expect(raffles.performUpkeep([])).to.be.revertedWith("Raffles__UpkeepNotNeeded")
        })
        it("Sets raffles state into CALCULATING", async() => {
            await raffles.enterRaffles({value: fee.toString()})
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.request({method: "evm_mine", params: []})
            await raffles.performUpkeep([])
            const rafflesState= await raffles.getRaffleState()
            assert.equal(rafflesState.toString(), "1")
        })
        it("Emits an event after requesting a winner", async() => {
            await raffles.enterRaffles({value: fee.toString()})
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.request({method: "evm_mine", params: []})
            await expect(raffles.performUpkeep([])).to.emit(raffles, "RequestedRaffleWinner")
        })
    })

    describe("fulfillRandomWords", () => {
        beforeEach(async() => {
            await raffles.enterRaffles({value: fee.toString()})
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.request({method: "evm_mine", params: []})
        })

        it("can only be called after performUpkeep", async() => {
            await expect(vrfCoordinator.fulfillRandomWords(1, raffles.address)).to.be.revertedWith("nonexistent request")
        })

        it("chooses a winner, deposits ETH and resets raffles", async() => {
            startingIndex = 1
            additionalEntry = 3
            const startingTimeStamp = await raffles.getLastTimeStamp()
            for(let i=startingIndex; i<=startingIndex+additionalEntry; i++) {
                rafflesContract = await raffles.connect(accounts[i])
                await rafflesContract.enterRaffles({value: fee.toString()})
            }

            new Promise(async(resolve, reject) => {
                raffles.once("RequestedRaffleWinner", async() => {
                    try{
                        const endingBalance = []
                        for(i=0; i<=startingIndex+additionalEntry; i++) {
                            endingBalance.push(accounts[i].getBalance())
                        }
                        const endTimeStamp = await getLastTimeStamp()
                        assert(endTimeStamp > startingTimeStamp)
                        const winner = await raffles.getWinner()
                        for(i=0; i<=startingIndex+additionalEntry; i++) {
                            assert.equal(winner.toString(), accounts[i])
                        }
                        const rafflesBalance = await raffles.getBalance()
                        assert(rafflesBalance, "0")
                        const rafflesState = await raffles.getRaffleState()
                        assert(rafflesState, "0")
                        const totalPlayer = await raffles.getTotalPlayers()
                        assert.equal(totalPlayer.toString(), "0")
                        const winnerBalance = winner.getBalance()
                        resolve() 
                } catch(err) {
                    reject()
                }                 
                })
            })
            const txRes = await raffles.performUpkeep([])
            const txRec = await txRes.wait(1)
            const requestId = txRec.events[1].args.requestId
            let startingBalance = []
            for(i=0; i<=startingIndex+additionalEntry; i++) {
                startingBalance.push(accounts[i].getBalance())
            }
            await vrfCoordinator.fulfillRandomWords(
                requestId.toString(),
                raffles.address
            )
        })
        
    })
})