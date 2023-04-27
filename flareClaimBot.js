const Web3 = require("web3");


const flareRPC = "https://api.flare.network/flare/bc/C/rpc";
const songbirdRPC = "https://api.flare.network/songbird/bc/C/rpc";
const flareRPCKey = "7wEcYkAeFbRKLx29utbe2ODQyAzwcGVqAtNGuBNWvGWQ5gGO";
const enableWrapping = 1; //1 = true, 0 = false
const pullFlareAddresses = true; 

/************************************************
        DO NOT CHANGE BELOW CODE
************************************************/
const FlareDistributionToDelegators = "0x9c7A4C83842B29bB4A082b0E689CB9474BD938d0";
const FlareFtsoRewardManager = "0x85627d71921AE25769f5370E482AdA5E1e418d37";
const FlareClaimSetupManager = "0xD56c0Ea37B848939B59e6F5Cda119b3fA473b5eB";

const SongBirdFtsoRewardManager = "0x13F7866568dC476cC3522d17C23C35FEDc1431C5";
const SongBirdClaimSetupManager = "0xDD138B38d87b0F95F6c3e13e78FFDF2588F1732d";

let network ="flare";
let activeRPC = flareRPC;
let DistributionToDelegators = FlareDistributionToDelegators;
let FtsoRewardManager = FlareFtsoRewardManager;
let ClaimSetupManager = FlareClaimSetupManager;

async function getFlareContractAddresses(){
    let response;
    if(network == "flare"){
        response = await fetch("https://gitlab.com/flarenetwork/flare-smart-contracts/-/raw/flare_network_deployed_code/deployment/deploys/flare.json?inline=false")
    } else{
        response = await fetch("https://gitlab.com/flarenetwork/flare-smart-contracts/-/raw/songbird_network_deployed_code/deployment/deploys/songbird.json?inline=false")
    }
    const addresses = await response.json()
    for (let i = 0; i < addresses.length; i++) {
        if (addresses[i].name === "DistributionToDelegators") {
            DistributionToDelegators = addresses[i].address.toString();
            break;
        }
    }
    for (let i = 0; i < addresses.length; i++) {
        if (addresses[i].name === "FtsoRewardManager") {
            FtsoRewardManager = addresses[i].address.toString();
            break;
        }
    }
    for (let i = 0; i < addresses.length; i++) {
        if (addresses[i].name === "ClaimSetupManager") {
            ClaimSetupManager = addresses[i].address.toString();
            break;
        }
    }
    
    console.log(`DistributionToDelegators: ${DistributionToDelegators}`)
    console.log(`FtsoRewardManager: ${FtsoRewardManager}`)
    console.log(`ClaimSetupManager: ${ClaimSetupManager}`)
}

if(flareRPCKey != "") {
    activeRPC = `${flareRPC}?x-apikey=${flareRPCKey}`
}

function createTx(web3, toAddress, fromAddress, functionString, functionInputs){    
    const DATA_INDEX = 1;
    const TYPE_INDEX = 0;
    const funcHash = Web3.utils.soliditySha3(functionString).substring(0, 10);
    let paramHash =  "";
    functionInputs.forEach(tInput => {     
        const param = web3.eth.abi.encodeParameter(tInput[TYPE_INDEX], tInput[DATA_INDEX]).toString();
        paramHash = `${paramHash}${param.split("x")[1]}`;
    });
    const txHash = (funcHash + paramHash).toString();

    return {
        data: txHash,
        from: fromAddress.toString(),
        to: toAddress.toString()
    };
}

async function processTx(web3, encodedTx){
	const body = {
		jsonrpc: "2.0",
		id: 1,
		method: "eth_call",
        params: [{
            data: encodedTx.data,
            from: encodedTx.from,
            to: encodedTx.to
        }, 'latest']
	};

	const response = await fetch(activeRPC, {
		method: 'POST',
		headers: {
            'Content-Type': 'application/json'
            },
		body: JSON.stringify(body)
	});

    const r_data = await response.json()
	return web3.eth.abi.decodeParameter('uint256', r_data.result);
}

function getCurrentMonth(web3, address) {
	const encodedTx = createTx(web3, DistributionToDelegators, address, "getCurrentMonth()", []);
    return processTx(web3, encodedTx)
}

function getCurrentRewardEpoch(web3, address) {
	const encodedTx = createTx(web3, FtsoRewardManager, address, "getCurrentRewardEpoch()", []);
    return processTx(web3, encodedTx)
}

async function signTxAndSend(web3, data, to, privateKey){
	const signedTx =  await web3.eth.accounts.signTransaction({
		to: to,
		data: data,
		gas: 8000000
	}, privateKey);
	const tx =  await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    return tx;
};

async function isAllowedToExecute(web3, address, executorAddress){
	const encodedTx = createTx(web3, ClaimSetupManager, executorAddress, "claimExecutors(address)", [["address", address]]);

	const body = {
		jsonrpc: "2.0",
		id: 1,
		method: "eth_call",
        params: [{
            data: encodedTx.data,
            from: encodedTx.from,
            to: encodedTx.to
        }, 'latest']
	};
    
	const response = await fetch(activeRPC, {
		method: 'POST',
		headers: {
            'Content-Type': 'application/json'
            },
		body: JSON.stringify(body)
	});

    const r_data = await response.json()
	const allowedAddress =  web3.eth.abi.decodeParameter('address[]', r_data.result);
    return allowedAddress.some((element) => element.toUpperCase() === executorAddress.toUpperCase())
}

async function getPublicKey(web3, privateKey) {
	const rt =  await web3.eth.accounts.privateKeyToAccount(privateKey);
    return rt.address;
}

async function claimDelegationRewards(network_, privateKey, addresses) {
    if(network_ == "songbird"){
        network = network_;
        activeRPC = `${songbirdRPC}?x-apikey=${flareRPCKey}`
        FtsoRewardManager = SongBirdFtsoRewardManager;
        ClaimSetupManager = SongBirdClaimSetupManager;
        DistributionToDelegators= "";
     } else if (network.toLowerCase() != "flare"){
        console.error('Error: network not supported');
        process.exit(1);
    }
    console.log(`Network: ${network_}`)

	const allAddress = addresses.split(",");
    if(pullFlareAddresses) {
       await getFlareContractAddresses()
    }
	
    if(allAddress.length >= 1){
        const web3 = new Web3(activeRPC);
        const publicAddress = await getPublicKey(web3, privateKey)
    
        const epochNumber = await getCurrentRewardEpoch(web3, publicAddress);
        for(let i = 0; i <  allAddress.length; i++ ){           

            if (Web3.utils.isAddress(allAddress[i])) {
                const canExecute = await isAllowedToExecute(web3, allAddress[i], publicAddress) ;
                if(canExecute == true){
                    console.log(`Claiming for address: ${allAddress[i]}`);
                    
                    const rawTx = createTx(web3, FtsoRewardManager, publicAddress, "claim(address,address,uint256,bool)", [
                        ["address", allAddress[i]],
                        ["address", allAddress[i]],
                        ["uint256", epochNumber],
                        ["bool", enableWrapping]
                    ]);
    
                    try {
                        const tx =  await signTxAndSend(web3, rawTx.data, FtsoRewardManager, privateKey);
                        console.log(`Tx Success - Tx Hash : ${tx.transactionHash}`);
                    } catch (error) {
                        console.log(`Tx Failed - ERROR: ${error}`);
                        process.exit(1);
                    };
                } else{
                    console.log(`Not allowed to claim for: ${allAddress[i]}`);
                }
            } else {
                console.log(`Address is not valid: ${allAddress[i]}`);
                process.exit(1);
            }
        };
    } else{
        console.log(`No Addresses to claim for.`)
        process.exit(1);
    }
}

async function claimFlareDrop(privateKey, addresses) {
	const allAddress = addresses.split(",");
    if(pullFlareAddresses) {
       await getFlareContractAddresses()
    }    
	
    if(allAddress.length >= 1){
        const web3 = new Web3(activeRPC);
        const publicAddress = await getPublicKey(web3, privateKey)
    
        const month  = parseInt(await getCurrentMonth(web3, publicAddress)) - 1;
        for(let i = 0; i <  allAddress.length; i++ ){
            
            if (Web3.utils.isAddress(allAddress[i])) {
                const canExecute = await isAllowedToExecute(web3, allAddress[i], publicAddress) ;
                if(canExecute == true){
                    console.log(`Claiming for address: ${allAddress[i]}`);
                    
                    const rawTx = createTx(web3, DistributionToDelegators, publicAddress, "claim(address,address,uint256,bool)", [
                        ["address", allAddress[i]],
                        ["address", allAddress[i]],
                        ["uint256", month] ,
                        ["bool", enableWrapping]
                    ]);
    
                    try {
                        const tx =  await signTxAndSend(web3, rawTx.data, DistributionToDelegators, privateKey);
                        console.log(`Tx Success - Tx Hash : ${tx.transactionHash}`);
                    } catch (error) {
                        console.log(`Tx Failed - ERROR: ${error}`);
                        process.exit(1);
                    };
                } else{
                    console.log(`Not allowed to claim for: ${allAddress[i]}`);
                }
            } else {
                console.log(`Address is not valid: ${allAddress[i]}`);
                process.exit(1);
            }
        };
    } else{
        console.log(`No Addresses to claim for.`)
        process.exit(1);
    }
}

function generateKeys(){
    const web3 = new Web3(activeRPC);
    const newWallet = web3.eth.accounts.create()
    console.log(`Public Key: ${newWallet.address}`)
    console.log(`Private Key: ${newWallet.privateKey}`)
}

if(process.argv.length < 3){
    console.error('Error: missing input argument');
    process.exit(1);
}else{
    if(process.argv[2].toLowerCase() == 'delegation' && process.argv.length == 6){
        console.log(`Running Claim Delegation Rewards Bot`)
        claimDelegationRewards(process.argv[3], process.argv[4], process.argv[5]);
    }else if(process.argv[2].toLowerCase() == 'drops' && process.argv.length == 5){
        console.log(`Running Claim Flare Drops Bot`)
        claimFlareDrop(process.argv[3], process.argv[4]);
    }else if(process.argv[2].toLowerCase() == 'key'){
        console.log(`Generating Key pair`)
        generateKeys();        
    } else{
        console.error('Error: claim option wrong');
        process.exit(1);
    }
}