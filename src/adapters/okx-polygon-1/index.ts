import * as dotenv from "dotenv";

dotenv.config();

import BigNumber from "bignumber.js";
import moment from "moment";
import { EventData } from "web3-eth-contract";
import path from "path";
import Matic from "../../sdk/matic";
import { ISaleEntity } from "../../sdk/Interfaces";

class OKX {
    name: string;
    protocol: string;
    block: number;
    deprecatedAtBlock: number;
    contract: string;
    events: string[];
    pathToAbi: string;
    range: number;
    chunkSize: number;
    sdk: any;

    constructor() {
        this.name = "okx-polygon-1";
        this.protocol = "polygon";
        this.block = 39574716;
        // this.deprecatedAtBlock = 39539879;
        this.contract = "0x954dab8830ad2b9c312bb87ace96f6cce0f51e3a";
        this.events = ["MatchOrderResultsV3"];
        this.pathToAbi = path.join(__dirname, "./abi.json");
        this.range = 500;
        this.chunkSize = 6;
    }

    run = async (): Promise<void> => {
        this.sdk = await this.loadSdk();
        await this.sdk.run();
    };

    loadSdk = (): any => {
        return new Matic(this);
    };

    stop = async (): Promise<void> => {
        this.sdk.stop();
    };

    _getToken = (item: any): string => {
        if (item[2] === "0x0000000000000000000000000000000000000000") {
            return "matic";
        }
        return item[2].toLowerCase();
    };

    _processItem = async (event: EventData, item: any): Promise<void> => {
        const [actionType, price, payToken, nftContract, tokenId, amount, tradeType, extraData] = item;
        const token = this._getToken(item);
        const maker = extraData.substring(0, 42);
        const taker = `0x${extraData.substring(42, 82)}`;
        const isAceeptOffer = Number(actionType) === 3;
        const block = await this.sdk.getBlock(event.blockNumber);
        const timestamp = moment.unix(block.timestamp).utc();
        const buyer = isAceeptOffer ? maker : taker;
        const seller = isAceeptOffer ? taker : maker;

        const entity = {
            providerName: this.name,
            providerContract: this.contract,
            protocol: this.protocol,
            nfts: [
                {
                    id: tokenId,
                    amount: Number(amount),
                    contract: nftContract.toLowerCase(),
                },
            ],
            token,
            price: new BigNumber(price),
            seller: seller.toLowerCase(),
            buyer: buyer.toLowerCase(),
            soldAt: timestamp,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            chainId: this.sdk.chainId,
        };
        await this.addToDatabase(entity);
    };

    process = async (event: EventData): Promise<void> => {
        const params = event.returnValues.params;
        for (let i = 0; i < params.length; i++) {
            await this._processItem(event, params[i]);
        }
    };

    addToDatabase = async (entity: ISaleEntity): Promise<ISaleEntity> => {
        return entity;
    };
}

export default OKX;
