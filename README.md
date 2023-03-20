# RPC
We need a RPC to submit our transactions to the network.

If you have your own Flare node, you can use its RPC or you can use a free one provided by Flare.

[Flare api-portal](https://api-portal.flare.network/) offers a free RPC that is limited to 1,000 calls a month. That is enough for what we plan to do. Tim Rowley created a great video on [YouTube](https://www.youtube.com/watch?v=YLWK41jzAOs) showing how to set up a Flare api account and get the RPC URL and api key that we need.

# Install and config
Install need packages
```javascript
npm install
```
Edit flareClaimBot.js
Add your Flare RPC api keys

```javascript
const flareRPC = "https://api.flare.network/flare/bc/C/rpc";
const flareRPCKey = ""
const enableWrapping = 1; //1 = true, 0 = false
const pullFlareAddresses = true; 
```

# Generate public and private key
```javascript
node ./flareClaimBot.js key
```

Send a small amount of FLR to the public address. It will be used to pay network fee when the claim bot submits transactions.

# Setting Executor
Go to [portal.flare.network](https://portal.flare.network/). Connect your wallet and add the the public address created above as the Executor for that wallet.

# Running bot
flareClaimBot.js 
[`delegation`|`drops`] 
[Private Key]
[String of addresses separated with a `,`]

## Claiming delegation rewards
```javascript
node ./flareClaimBot.js delegation 0x9eb31536f80d54f1c6df77ab5585376e492219d377780d90d3c36e6d93ef7d40 0x33C8AAd916cF43d020b3104D4cEc19ba66d6d53d,0x8222f89A712Da616061aB59a23039F2a25Ea5766,0x9D4099E1558EB632954be0Eb97164d34Fd14934E
```

## Claiming flare Drop
```javascript
node ./flareClaimBot.js drops 0x9eb31536f80d54f1c6df77ab5585376e492219d377780d90d3c36e6d93ef7d40 0x33C8AAd916cF43d020b3104D4cEc19ba66d6d53d,0x8222f89A712Da616061aB59a23039F2a25Ea5766,0x9D4099E1558EB632954be0Eb97164d34Fd14934E
```

# License

[MIT](https://choosealicense.com/licenses/mit/)