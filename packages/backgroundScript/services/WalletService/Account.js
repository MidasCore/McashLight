import StorageService from '../StorageService';
import McashWeb from 'mcashweb';
import Logger from '@mcashlight/lib/logger';
import Utils from '@mcashlight/lib/utils';
import NodeService from '../NodeService';
import { BigNumber } from 'bignumber.js';
import { ACCOUNT_TYPE } from '@mcashlight/lib/constants';
import axios from 'axios';

BigNumber.config({ EXPONENTIAL_AT: [-20, 30] });

const logger = new Logger('WalletService/Account');

class Account {
    constructor(accountType, importData, accountIndex = 0) {
        this.type = accountType;
        this.accountIndex = accountIndex;

        this.address = false;
        this.name = false;
        this.updatingTransactions = false;
        this.selectedBankRecordId = 0;
        this.dealCurrencyPage = 0;
        this.energy = 0;
        this.energyUsed = 0;
        this.balance = 0;
        this.frozenBalance = 0;
        this.stakeBalance = 0;
        this.netUsed = 0;
        this.netLimit = 10000;
        this.totalEnergyWeight = 0; //totalEnergyWeight
        this.totalEnergyLimit = 0; //totalEnergyLimit
        this.lastUpdated = 0;
        this.asset = 0;
        this.ignoredTransactions = [];
        this.transactions = {};
        this.airdropInfo = {};
        this.tokens = {
            basic: {},
            smart: {}
        };
        this.stake = {};
        this.activated = false;
        this.hasDisplayedActivationPrompt = false;
        if(accountType == ACCOUNT_TYPE.MNEMONIC)
            this._importMnemonic(importData);
        else this._importPrivateKey(importData);

        this.loadCache();
        //this._cacheTransactions();
    }

    static generateAccount() {
        const mnemonic = Utils.generateMnemonic();

        return new Account(
            ACCOUNT_TYPE.MNEMONIC,
            mnemonic
        );
    }

    async _cacheTransactions() {
        const { address } = this;
        const txID = StorageService.getNextPendingTransaction(address);

        if(!txID)
            return setTimeout(() => this._cacheTransactions(), 3000);

        logger.info(`Caching transaction ${ txID }`);

        StorageService.removePendingTransaction(address, txID);

        const txData = await NodeService.mcashWeb.mcash.getTransactionInfo(txID);

        if(!txData.id) {
            logger.info(`Transaction ${ txID } is still missing`);
            StorageService.addPendingTransaction(address, txID);

            return setTimeout(() => this._cacheTransactions(), 3000);
        }

        logger.info(`Transaction ${ txID } has been cached`);

        const transaction = this.transactions[ txID ];

        transaction.cached = true;
        transaction.timestamp = txData.block_timestamp;
        transaction.receipt = txData.receipt || false;
        transaction.result = txData.contract_result || false;

        this.transactions[ txID ] = transaction;
        this.save();

        this._cacheTransactions();
    }

    _importMnemonic(mnemonic) {
        if(!Utils.validateMnemonic(mnemonic))
            throw new Error('INVALID_MNEMONIC');

        this.mnemonic = mnemonic;

        const {
            privateKey,
            address
        } = this.getAccountAtIndex(this.accountIndex);

        this.privateKey = privateKey;
        this.address = address;
    }

    _importPrivateKey(privateKey) {
        try {
            this.privateKey = privateKey;
            this.address = McashWeb.address.fromPrivateKey(privateKey);
            logger.info(`address = ${ this.address}`);
        } catch (ex) { // eslint-disable-line
            throw new Error('INVALID_PRIVATE_KEY');
        }
    }

    getAccountAtIndex(index = 0) {
        if(this.type !== ACCOUNT_TYPE.MNEMONIC)
            throw new Error('Deriving account keys at a specific index requires a mnemonic account');

        return Utils.getAccountAtIndex(
            this.mnemonic,
            index
        );
    }

    loadCache() {
        if(!StorageService.hasAccount(this.address))
            return logger.warn('Attempted to load cache for an account that does not exist');

        const {
            type,
            name,
            balance,
            frozenBalance,
            stakeBalance,
            totalEnergyWeight,
            totalEnergyLimit,
            transactions,
            tokens,
            netLimit,
            netUsed,
            energy,
            energyUsed,
            lastUpdated,
            asset,
            stake,
            activated,
            hasDisplayedActivationPrompt
        } = StorageService.getAccount(this.address);

        // Old M1 structure are no longer compatible
        //tokens.basic = {};

        // Remove old token transfers so they can be fetched again
        Object.keys(this.transactions).forEach(txID => {
            const transaction = this.transactions[ txID ];

            if(transaction.type !== 'TransferAssetContract')
                return;

            if(transaction.tokenID)
                return;

            delete this.transactions[ txID ];
        });

        this.type = type;
        this.name = name;
        this.balance = balance;
        this.frozenBalance = frozenBalance;
        this.stakeBalance = stakeBalance;
        this.totalEnergyWeight = totalEnergyWeight;
        this.totalEnergyLimit = totalEnergyLimit;
        this.transactions = transactions;
        this.tokens = tokens;
        this.energy = energy;
        this.energyUsed = energyUsed;
        this.netLimit = netLimit;
        this.netUsed = netUsed;
        this.lastUpdated = lastUpdated;
        this.asset = asset;
        this.stake = stake;
        this.activated = activated;
        this.hasDisplayedActivationPrompt = hasDisplayedActivationPrompt;
    }

    matches(accountType, importData) {
        if(this.type !== accountType)
            return false;

        if(accountType == ACCOUNT_TYPE.MNEMONIC && this.mnemonic === importData)
            return true;

        if(accountType == ACCOUNT_TYPE.PRIVATE_KEY && this.privateKey === importData)
            return true;

        return false;
    }

    reset() {
        this.balance = 0;
        this.frozenBalance = 0;
        this.stakeBalance = 0;
        this.energy = 0;
        this.energyUsed = 0;
        this.netUsed = 0;
        this.transactions = {};
        this.ignoredTransactions = [];
        this.netLimit = 0;
        this.asset = 0;
        Object.keys(this.tokens.smart).forEach(address => (
            this.tokens.smart[ address ].balance = 0
        ));

        this.tokens.basic = {};
        this.stake = {};
        this.activated = false;
    }

    async update(basicTokenPriceList, smartTokenPriceList) {
        const { address } = this;
        logger.info(`Requested update for ${ address }`);
        try {
            const account = await NodeService.mcashWeb.mcash.getUnconfirmedAccount(address);
            if (!account.address) {
                logger.info(`Account ${address} does not exist on the network`);
                this.reset();
                return true;
            }
            this.activated = true;
            const frozenBalanceForBandwidth = account.frozen_for_bandwidth && account.frozen_for_bandwidth.frozen_balance ? account.frozen_for_bandwidth.frozen_balance : 0;
            const frozenBalanceForEnergy = account.frozen_for_energy && account.frozen_for_energy.frozen_balance ? account.frozen_for_energy.frozen_balance : 0;
            this.frozenBalance = new BigNumber(frozenBalanceForBandwidth).plus(new BigNumber(frozenBalanceForEnergy)).toNumber();
            const witnessStakeBalance = account.witness_stake && account.witness_stake.stake_amount ? account.witness_stake.stake_amount : 0;
            const stakeBalance = account.stake && account.stake.stake_amount ? account.stake.stake_amount : 0;
            this.stakeBalance = new BigNumber(witnessStakeBalance).plus(new BigNumber(stakeBalance)).toNumber();
            this.balance = account.balance || 0;
            this.stake = account.stake || {};
            const filteredTokens = (account.assets || []).filter(({ value }) => {
                return value > 0;
            });
            if (filteredTokens.length > 0) {
                for (const { key, value } of filteredTokens) {
                    let token = this.tokens.basic[ key ] || false;
                    const filter = basicTokenPriceList.filter(({ first_token_id: firstTokenId }) => firstTokenId === key);
                    const token20Filter = smartTokenPriceList.filter(({ fTokenAddr }) => key === fTokenAddr);
                    const obj = filter.length ? filter[ 0 ] : (token20Filter.length ? {
                        price: token20Filter[ 0 ].price,
                        precision: token20Filter[ 0 ].sPrecision
                    } : { price: 0, precision: 0 });
                    const price = obj.price / Math.pow(10, obj.precision);
                    if ((!token && !StorageService.tokenCache.hasOwnProperty(key)) || (token && typeof token.imgUrl === 'undefined'))
                        await StorageService.cacheToken(key);

                    if (StorageService.tokenCache.hasOwnProperty(key)) {
                        const {
                            name,
                            abbr,
                            decimals,
                            imgUrl
                        } = StorageService.tokenCache[ key ];

                        token = {
                            balance: 0,
                            name,
                            abbr,
                            decimals,
                            imgUrl
                        };
                    }
                    this.tokens.basic[ key ] = {
                        ...token,
                        balance: value,
                        price
                    };
                }
            } else
                this.tokens.basic = {};

            //this.tokens.smart = {};
            const addSmartTokens = Object.entries(this.tokens.smart).filter(([tokenId, token]) => {
                return !token.abbr;
            });
            for (const [tokenId, token] of addSmartTokens) {
                const contract = await NodeService.mcashWeb.contract().at(tokenId).catch(e => false);
                if (contract) {
                    let balance;
                    const number = await contract.balanceOf(address).call();
                    if (number.balance)
                        balance = new BigNumber(number.balance).toString();
                    else
                        balance = new BigNumber(number).toString();

                    if (typeof token.name === 'object') {
                        const token2 = await NodeService.getSmartToken(tokenId);
                        this.tokens.smart[ tokenId ] = token2;
                    } else
                        this.tokens.smart[ tokenId ] = token;

                    // todo: check logo_url (imgUrl)
                    this.tokens.smart[ tokenId ].imgUrl = false;
                    this.tokens.smart[ tokenId ].balance = balance;
                    this.tokens.smart[ tokenId ].price = 0;
                } else {
                    this.tokens.smart[ tokenId ].balance = 0;
                    this.tokens.smart[ tokenId ].price = 0;
                }
            }
            //
            let totalOwnMcashCount = new BigNumber(this.balance + this.stakeBalance + this.frozenBalance).shiftedBy(-8);
            Object.entries({ ...this.tokens.basic, ...this.tokens.smart }).forEach(([tokenId, token]) => {
                if (token.price !== 0) {
                    const price = token.price;
                    totalOwnMcashCount = totalOwnMcashCount.plus(new BigNumber(token.balance).shiftedBy(-token.decimals).multipliedBy(price));
                }
            });
            this.asset = totalOwnMcashCount.toNumber();
            this.lastUpdated = Date.now();
            await Promise.all([
                this.updateBalance(),
                //this.updateTokens(tokens.smart)
            ]);
            logger.info(`Account ${address} successfully updated`);
            this.save();
        } catch(error) {
            console.log(error);
        }
        return true;
    }

    async updateBalance() {
        const { address } = this;
        // await NodeService.mcashWeb.mcash.getBandwidth(address)
        //     .then((bandwidth = 0) => (
        //         this.bandwidth = bandwidth
        //     ));
        const result = await NodeService.mcashWeb.mcash.getAccountResources(address);
        this.energy = result.energy_limit || 0;
        this.energyUsed = result.energy_used || 0;
        this.netLimit = (result.free_bandwidth_limit || 0) + (result.bandwidth_limit || 0);
        this.netUsed = (result.bandwidth_used || 0) + (result.free_bandwidth_used || 0);
        this.totalEnergyWeight = result.total_energy_weight || 0;
        this.totalEnergyLimit = result.total_energy_limit || 0;
    }

    async addSmartToken({ address, name, decimals, symbol }) {
        logger.info(`Adding M20 token '${ address }' ${ name } (${ symbol }) to account '${ this.address }'`);

        let balance = 0;

        try {
            const contract = await NodeService.mcashWeb.contract().at(address);
            const balanceObj = await contract.balanceOf(this.address).call();

            const bn = new BigNumber(balanceObj.balance || balanceObj);

            if(bn.isNaN())
                balance = '0';
            else balance = bn.toString();
        } catch {}

        this.tokens.smart[ address ] = {
            balance,
            decimals,
            symbol,
            name
        };

        return this.save();
    }

    async initSmartTokens() {
        const { address } = this;
        logger.info(`Requested smart tokens for ${ address }`);
        const currentNode = NodeService.getCurrentNode();
        const baseUrl = currentNode && currentNode.mcashScan ? currentNode.mcashScan : 'https://api.mcashscan.io';
        const { data } = await axios.get(`${baseUrl}/api/accounts/${address}`).catch(() => ( { data: {} } ));
        const result = data ? data : {};
        const tokenBalances = result && Array.isArray(result.token_balances) ? result.token_balances.filter(item => item && !!item.contract_address) : [];
        if (tokenBalances.length > 0) {
            for (const item of result.token_balances) {
                const tokenId = item.contract_address;
                if (!tokenId)
                    return;
                const contract = await NodeService.mcashWeb.contract().at(tokenId).catch(() => false);
                if (contract) {
                    const number = await contract.balanceOf(address).call();
                    const balance = new BigNumber(number.balance ? number.balance : number).toString();
                    const d = await contract.decimals().call();
                    const name = await contract.name().call();
                    const symbol = await contract.symbol().call();
                    const decimals = typeof d === 'object' && d._decimals ? d : new BigNumber(d).toNumber();
                    this.tokens.smart[ tokenId ] = {
                        name,
                        symbol,
                        decimals,
                        imgUrl: false,
                        balance,
                        price: 0
                    };
                } else {
                    this.tokens.smart[ tokenId ] = {
                        balance: 0,
                        price: 0
                    };
                }
            }
        }
    }

    getDetails() {
        return {
            tokens: this.tokens,
            type: this.type,
            name: this.name,
            address: this.address,
            balance: this.balance,
            frozenBalance: this.frozenBalance,
            stakeBalance: this.stakeBalance,
            totalEnergyWeight: this.totalEnergyWeight,
            totalEnergyLimit: this.totalEnergyLimit,
            energy: this.energy,
            energyUsed: this.energyUsed,
            netLimit: this.netLimit,
            netUsed: this.netUsed,
            transactions: this.transactions,
            lastUpdated: this.lastUpdated,
            selectedBankRecordId: this.selectedBankRecordId,
            dealCurrencyPage: this.dealCurrencyPage,
            airdropInfo: this.airdropInfo,
            stake: this.stake,
            activated: this.activated,
            hasDisplayedActivationPrompt: this.hasDisplayedActivationPrompt
        };
    }

    export() {
        return JSON.stringify(this);
    }

    save() {
        StorageService.saveAccount(this);
    }

    async sign(transaction) {
        const mcashWeb = NodeService.mcashWeb;
        const signedTransaction = mcashWeb.mcash.sign(
            transaction,
            this.privateKey
        );

        return await signedTransaction;
    }

    async sendMcash(recipient, amount) {
        try {
            const transaction = await NodeService.mcashWeb.transactionBuilder.sendMcash(
                recipient,
                amount
            );

            await NodeService.mcashWeb.mcash.sendRawTransaction(
                await this.sign(transaction)
            ).then(() => true).catch(err => Promise.reject(
                'Failed to broadcast transaction'
            ));
        } catch(ex) {
            logger.error('Failed to send MCASH:', ex);
            return Promise.reject(ex);
        }
    }

    async sendBasicToken(recipient, amount, token) {
        try {
            let tokenId = token;
            if (typeof token === 'string')
                tokenId = parseInt(token, 10);

            const transaction = await NodeService.mcashWeb.transactionBuilder.sendToken(
                recipient,
                amount,
                tokenId
            );

            await NodeService.mcashWeb.mcash.sendRawTransaction(
                await this.sign(transaction)
            ).then(() => true).catch(err => Promise.reject(
                'Failed to broadcast transaction'
            ));
        } catch(ex) {
            logger.error('Failed to send basic token:', ex);
            return Promise.reject(ex);
        }
    }

    async sendSmartToken(recipient, amount, token) {
        try {
            const contract = await NodeService.mcashWeb.contract().at(token);

            // todo: check feeLimit
            await contract.transfer(recipient, amount).send(
                { feeLimit: 10 * Math.pow(10, 8) },
                this.privateKey
            );
            return true;
        } catch(ex) {
            logger.error('Failed to send smart token:', ex);
            return Promise.reject(ex);
        }
    }

    async createAccount(accountAddress) {
        try {
            const account = await NodeService.mcashWeb.transactionBuilder.createAccount(accountAddress);
            await NodeService.mcashWeb.mcash.sendRawTransaction(
                await this.sign(account)
            ).then(() => true).catch(err => Promise.reject(
                'Failed to activated account'
            ));
        } catch(ex) {
            logger.error('Failed to activated account:', ex);
            return Promise.reject(ex);
        }
    }

    closeActivationPrompt() {
        this.hasDisplayedActivationPrompt = true;
        this.save();
    }
}

export default Account;
