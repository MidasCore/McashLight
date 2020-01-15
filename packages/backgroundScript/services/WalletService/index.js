import Logger from '@mcashlight/lib/logger';
import EventEmitter from 'eventemitter3';
import StorageService from '../StorageService';
import NodeService from '../NodeService';
import Account from './Account';
import axios from 'axios';
import extensionizer from 'extensionizer';
import Utils from '@mcashlight/lib/utils';
import McashWeb from 'mcashweb';

import {
    APP_STATE,
    ACCOUNT_TYPE
} from '@mcashlight/lib/constants';

const logger = new Logger('WalletService');
let basicPrice;
let smartPrice;
class Wallet extends EventEmitter {
    constructor() {
        super();

        this.state = APP_STATE.UNINITIALISED;
        this.selectedAccount = false;
        this.isConfirming = false;
        this.popup = false;
        this.accounts = {};
        this.contractWhitelist = {};
        this.confirmations = [];
        this.timer = {};
        // This should be moved into its own component
        this.isPolling = false;
        this.shouldPoll = false;
        this._checkStorage(); //change store by judge
        this.bankContractAddress = 'TPgbgZReSnPnJeXPakHcionXzsGk6kVqZB'; //online

        setInterval(() => {
            this._updatePrice();
        }, 30 * 60 * 1000);
    }

    async _checkStorage() {
        if(await StorageService.dataExists() || StorageService.needsMigrating)
            this._setState(APP_STATE.PASSWORD_SET); // initstatus APP_STATE.PASSWORD_SET
    }

    migrate(password) {
        if(!StorageService.needsMigrating) {
            logger.info('No migration required');
            return false;
        }

        StorageService.authenticate(password);

        const {
            error = false,
            accounts,
            selectedAccount
        } = StorageService.migrate();

        if(error)
            return false;

        localStorage.setItem('McashLink_WALLET.bak', localStorage.getItem('McashLink_WALLET'));
        localStorage.removeItem('McashLink_WALLET');

        accounts.forEach(account => (
            this.importAccount(account)
        ));

        this.selectAccount(selectedAccount);

        // Force "Reboot" McashLight
        this.state = APP_STATE.PASSWORD_SET;
        StorageService.ready = false;

        this.unlockWallet(StorageService.password);

        return true;
    }

    _setState(appState) {
        if(this.state === appState)
            return;

        logger.info(`Setting app state to ${ appState }`);

        this.state = appState;
        this.emit('newState', appState);
        // if(appState === APP_STATE.DAPP_LIST) {
        //     ga('send', 'event', {
        //         eventCategory: 'Dapp List',
        //         eventAction: 'Recommend',
        //         eventLabel: 'Recommend',
        //         eventValue: McashWeb.address.fromHex(this.selectedAccount),
        //         userId: Utils.hash(McashWeb.address.toHex(this.selectedAccount))
        //     });
        // }

        return appState;
    }

    _loadAccounts() {
        const accounts = StorageService.getAccounts();
        const selected = StorageService.selectedAccount;
        Object.entries(accounts).forEach(([ address, account ]) => {
            const accountObj = new Account(
                account.type,
                account.mnemonic || account.privateKey,
                account.accountIndex
            );

            accountObj.loadCache();
            accountObj.update([], [], 0);

            this.accounts[ address ] = accountObj;
        });

        this.selectedAccount = selected;
    }

    async _pollAccounts() {
        clearTimeout(this.timer);
        if(!this.shouldPoll) {
            logger.info('Stopped polling');
            return this.isPolling = false;
        }

        if(this.isPolling)
            return;

        this.isPolling = true;

        const accounts = Object.values(this.accounts);
        if(accounts.length > 0) {
            // const { data: { data: basicTokenPriceList } } = await axios.get('https://api.midasprotocol.com/token/v1/prices?fromCodes=MCASH@1000011,MCASH@1000001&toCodes=USD,BTC,ETH').catch(() => {
            //     logger.error('get M1 token price fail');
            //     return { data: { data: { items: [] } } };
            // });
            // const { data: { data: { rows: smartTokenPriceList } } } = await axios.get('https://api.midasprotocol.com/token/v1/prices?fromCodes=MCASH@MEKeo29kLUVEdckZ65F9ZnZGpgEDJpshsb&toCodes=USD,BTC,ETH').catch(() => {
            //     logger.error('get M20 token price fail');
            //     return { data: { data: { items: [] } } };
            // });
            // const prices = StorageService.prices;
            basicPrice = []; //basicTokenPriceList
            smartPrice = []; //smartTokenPriceList
            for (const account of accounts) {
                if (account.address === this.selectedAccount) {
                    // get prices
                    if (NodeService.getPriceApiUrl('')) {
                        let basicCodes = '';
                        let smartCodes = '';
                        const { basic, smart } = account.tokens || {};
                        if (basic && Object.keys(basic).length > 0)
                            basicCodes += Object.keys(basic).map(id => `MCASH@${ id }`).join(',');
                        if (smart && Object.keys(smart).length > 0)
                            smartCodes += Object.keys(smart).map(id => `MCASH@${ id }`).join(',');
                        const { data: { data: basicData } } = await axios.get(NodeService.getPriceApiUrl(basicCodes))
                            .catch(() => {
                                logger.error('get M1 token price fail');
                                return { data: { data: { items: [] } } };
                            });
                        basicPrice = basicData && Array.isArray(basicData.items) ? basicData.items : [];
                        const { data: { data: smartData } } = await axios.get(NodeService.getPriceApiUrl(smartCodes))
                            .catch(() => {
                                logger.error('get M20 token price fail');
                                return { data: { data: { items: [] } } };
                            });
                        smartPrice = smartData && Array.isArray(smartData.items) ? smartData.items : [];
                    }
                    //
                    Promise.all([account.update(basicPrice, smartPrice)]).then(() => {
                        if (account.address === this.selectedAccount)
                            this.emit('setAccount', this.selectedAccount);
                    }).catch(e => {
                        console.log(e);
                    });
                } else
                    await account.update(basicPrice, smartPrice);
                    //continue;
            }
            this.emit('setAccounts', this.getAccounts());
        }
        this.isPolling = false;
        this.timer = setTimeout(() => {
            this._pollAccounts(); // ??TODO repeatedly request
        }, 10000);
    }

    async _updatePrice() {
        if(!StorageService.ready)
            return;
        const prices = axios('https://api.midasprotocol.com/token/v1/prices/map?fromCodes=MCASH&toCodes=USD%2CBTC%2CETH');
        Promise.all([prices]).then(res => {
            const resData = res[ 0 ].data ? res[ 0 ].data.data : {};
            const items = resData ? resData.items : {};
            const rates = items && items.MCASH ? items.MCASH.rates : {};
            const ret = {};
            Object.keys(rates).forEach(k => {
                ret[ k.toUpperCase() ] = rates[ k ].rate;
            });
            // const ret = Object.fromEntries(
            //     Object.entries(res[0].data["MCASH"]).map(([k, v]) => [k.toUpperCase(), v])
            // );
            StorageService.setPrices(ret);
            this.emit('setPriceList', [ret]);
        }).catch(e => logger.warn('Failed to update prices'));
    }

    selectCurrency(currency) {
        StorageService.selectCurrency(currency);
        this.emit('setCurrency', currency);
    }

    async _updateWindow() {
        return new Promise(resolve => {
            if(typeof chrome !== 'undefined') {
                return extensionizer.windows.update(this.popup.id, { focused: true }, window => {
                    resolve(!!window);
                });
            }

            extensionizer.windows.update(this.popup.id, {
                focused: true
            }).then(resolve).catch(() => resolve(false));
        });
    }

    async _openPopup() {
        if(this.popup && this.popup.closed)
            this.popup = false;

        if(this.popup && await this._updateWindow())
            return;

        if(typeof chrome !== 'undefined') {
            return extensionizer.windows.create({
                url: 'packages/popup/build/index.html',
                type: 'popup',
                width: 360,
                height: 600,
                left: 25,
                top: 25
            }, window => this.popup = window);
        }

        this.popup = await extensionizer.windows.create({
            url: 'packages/popup/build/index.html',
            type: 'popup',
            width: 360,
            height: 600,
            left: 25,
            top: 25
        });
    }

    _closePopup() {
        if(this.confirmations.length)
            return;

        if(!this.popup)
            return;

        extensionizer.windows.remove(this.popup.id);
        this.popup = false;
    }

    startPolling() {
        if(this.isPolling && this.shouldPoll)
            return; // Don't poll if already polling

        if(this.isPolling && !this.shouldPoll)
            return this.shouldPoll = true;

        logger.info('Started polling');

        this.shouldPoll = true;
        this._pollAccounts();
    }

    stopPolling() {
        this.shouldPoll = false;
    }

    async refresh() {
        let res;
        const accounts = Object.values(this.accounts);
        for(const account of accounts) {
            if(account.address === this.selectedAccount) {
                const r = await account.update(basicPrice, smartPrice).catch(e => false);
                if(r) {
                    res = true;
                    this.emit('setAccount', this.selectedAccount);
                } else
                    res = false;
            }else
                continue;
                //await account.update(basicPrice,smartPrice);
        }
        this.emit('setAccounts', this.getAccounts());
        return res;
    }

    changeState(appState) {
        const stateAry = [
            APP_STATE.PASSWORD_SET,
            APP_STATE.RESTORING,
            APP_STATE.CREATING,
            APP_STATE.RECEIVE,
            APP_STATE.SEND,
            APP_STATE.TRANSACTIONS,
            APP_STATE.SETTING,
            APP_STATE.ADD_M20_TOKEN,
            APP_STATE.READY,
            APP_STATE.TESTHMTL,
            APP_STATE.TRONBANK,
            APP_STATE.TRONBANK_RECORD,
            APP_STATE.TRONBANK_DETAIL,
            APP_STATE.TRONBANK_HELP,
            APP_STATE.DAPP_LIST,
            APP_STATE.ACTIVE_ACCOUNT
        ];
        if(!stateAry.includes(appState))
            return logger.error(`Attempted to change app state to ${ appState }. Only 'restoring' and 'creating' is permitted`);

        this._setState(appState);
    }

    async resetState() {
        logger.info('Resetting app state');

        if(!await StorageService.dataExists())
            return this._setState(APP_STATE.UNINITIALISED);

        if(!StorageService.hasAccounts && !StorageService.ready)
            return this._setState(APP_STATE.PASSWORD_SET);

        if(!StorageService.hasAccounts && StorageService.ready)
            return this._setState(APP_STATE.UNLOCKED);

        if(StorageService.needsMigrating)
            return this._setState(APP_STATE.MIGRATING);

        if(this.state === APP_STATE.REQUESTING_CONFIRMATION && this.confirmations.length)
            return;

        this._setState(APP_STATE.READY);
    }

    // We shouldn't handle requests directly in WalletService.
    setPassword(password) {
        if(this.state !== APP_STATE.UNINITIALISED)
            return Promise.reject('ERRORS.ALREADY_INITIALISED');

        StorageService.authenticate(password);
        StorageService.save();
        NodeService.save();

        this._updatePrice();

        logger.info('User has set a password');
        this._setState(APP_STATE.UNLOCKED);

        const node = NodeService.getCurrentNode();

        this.emit('setNode', {
            fullNode: node.fullNode,
            solidityNode: node.solidityNode,
            eventServer: node.eventServer
        });
    }

    async unlockWallet(password) {
        if(this.state !== APP_STATE.PASSWORD_SET) {
            logger.error('Attempted to unlock wallet whilst not in PASSWORD_SET state');
            return Promise.reject('ERRORS.NOT_LOCKED');
        }

        if(StorageService.needsMigrating) {
            const success = this.migrate(password);

            if(!success)
                return Promise.reject('ERRORS.INVALID_PASSWORD');

            return;
        }

        const unlockFailed = await StorageService.unlock(password);
        if(unlockFailed) {
            logger.error(`Failed to unlock wallet: ${ unlockFailed }`);
            return Promise.reject(unlockFailed);
        }

        if(!StorageService.hasAccounts) {
            logger.info('Wallet does not have any accounts');
            return this._setState(APP_STATE.UNLOCKED);
        }

        NodeService.init();

        this._loadAccounts();
        this._updatePrice();

        const node = NodeService.getCurrentNode();
        this.emit('setNode', {
            fullNode: node.fullNode,
            solidityNode: node.solidityNode,
            eventServer: node.eventServer
        });
        this.emit('setAccount', this.selectedAccount);
        const setting = this.getSetting();
        setting.lock.lockTime = new Date().getTime();
        this.setSetting(setting);
        if (this.confirmations.length === 0)
            this._setState(APP_STATE.READY);
        else
            this._setState(APP_STATE.REQUESTING_CONFIRMATION);

        // const { data: { data : { list: dapps  } } } = await axios.get('https://dappradar.com/api/xchain/dapps/theRest',{ timeout: 5000 }).catch(e=>({ data: { data : { list: []  } } }));
        // const { data: { data : { list: dapps2 } } } = await axios.get('https://dappradar.com/api/xchain/dapps/list/0', { timeout: 5000 }).catch(e=>({ data: { data : { list: []  } } }));
        // const tronDapps =  dapps.concat(dapps2).filter(({ protocols: [ type ] }) => type === 'tron').map(({ logo: icon, url: href, title: name }) => ({ icon, href, name }));
        // StorageService.saveAllDapps(tronDapps);
    }

    async lockWallet() {
        StorageService.lock();
        this.accounts = {};
        this.selectedAccount = false;
        this.emit('setAccount', this.selectedAccount);
        this._setState(APP_STATE.PASSWORD_SET);
    }

    async verifyPassword(password) {
        const unlockFailed = await StorageService.verify(password);
        if(unlockFailed) {
            logger.error(`Failed to unlock wallet: ${ unlockFailed }`);
            return Promise.reject(unlockFailed);
        }
        return Promise.resolve(true);
    }

    queueConfirmation(confirmation, uuid, callback) {
        this.confirmations.push({
            confirmation,
            callback,
            uuid
        });

        if(this.state === APP_STATE.PASSWORD_SET) {
            this.emit('setConfirmations', this.confirmations);
            this._openPopup();
            return;
        }

        if(this.state !== APP_STATE.REQUESTING_CONFIRMATION)
            this._setState(APP_STATE.REQUESTING_CONFIRMATION);

        logger.info('Added confirmation to queue', confirmation);

        this.emit('setConfirmations', this.confirmations);
        this._openPopup();
    }

    whitelistContract(confirmation, duration) {
        const {
            input: {
                contract_address: address
            },
            contractType,
            hostname
        } = confirmation;

        if(!address)
            return Promise.reject('INVALID_CONFIRMATION');

        if(contractType !== 'TriggerSmartContract')
            return Promise.reject('INVALID_CONFIRMATION');

        if(!this.contractWhitelist[ address ])
            this.contractWhitelist[ address ] = {};

        this.contractWhitelist[ address ][ hostname ] = (
            duration === -1 ?
                -1 :
                Date.now() + duration
        );

        logger.info(`Added contact ${ address } on host ${ hostname } with duration ${ duration } to whitelist`);

        ga('send', 'event', {
            eventCategory: 'Smart Contract',
            eventAction: 'Whitelisted Smart Contract',
            eventLabel: McashWeb.address.fromHex(confirmation.input.contract_address),
            eventValue: duration,
            referrer: confirmation.hostname,
            userId: Utils.hash(confirmation.input.owner_address)
        });

        this.acceptConfirmation();
    }

    acceptConfirmation(whitelistDuration) {
        if(!this.confirmations.length)
            return Promise.reject('NO_CONFIRMATIONS');

        if(this.isConfirming)
            return Promise.reject('ALREADY_CONFIRMING');

        this.isConfirming = true;

        const {
            confirmation,
            callback,
            uuid
        } = this.confirmations.pop();

        if(whitelistDuration !== false)
            this.whitelistContract(confirmation, whitelistDuration);

        ga('send', 'event', {
            eventCategory: 'Transaction',
            eventAction: 'Confirmed Transaction',
            eventLabel: confirmation.contractType || 'SignMessage',
            eventValue: confirmation.input.amount || 0,
            referrer: confirmation.hostname,
            userId: Utils.hash(
                McashWeb.address.toHex(this.selectedAccount)
            )
        });

        callback({
            success: true,
            data: confirmation.signedTransaction,
            uuid
        });

        this.isConfirming = false;
        if(this.confirmations.length)
            this.emit('setConfirmations', this.confirmations);

        this._closePopup();
        this.resetState();
    }

    rejectConfirmation() {
        if(this.isConfirming)
            return Promise.reject('ALREADY_CONFIRMING');

        this.isConfirming = true;

        const {
            confirmation,
            callback,
            uuid
        } = this.confirmations.pop();

        ga('send', 'event', {
            eventCategory: 'Transaction',
            eventAction: 'Rejected Transaction',
            eventLabel: confirmation.contractType || 'SignMessage',
            eventValue: confirmation.input.amount || 0,
            referrer: confirmation.hostname,
            userId: Utils.hash(
                McashWeb.address.toHex(this.selectedAccount)
            )
        });

        callback({
            success: false,
            data: 'Confirmation declined by user',
            uuid
        });

        this.isConfirming = false;
        if(this.confirmations.length)
            this.emit('setConfirmations', this.confirmations);

        this._closePopup();
        this.resetState();
    }

    addAccount({ mnemonic, name }) {
        logger.info(`Adding account '${ name }' from popup`);

        const account = new Account(
            ACCOUNT_TYPE.MNEMONIC,
            mnemonic
        );

        const {
            address
        } = account;

        account.name = name;

        this.accounts[ address ] = account;
        StorageService.saveAccount(account);

        this.emit('setAccounts', this.getAccounts());
        this.selectAccount(address);
    }

    // This and the above func should be merged into one
    importAccount({ privateKey, name }) {
        logger.info(`Importing account '${ name }' from popup`);

        const account = new Account(
            ACCOUNT_TYPE.PRIVATE_KEY,
            privateKey
        );

        const {
            address
        } = account;

        account.name = name;

        this.accounts[ address ] = account;
        this.accounts[ address ].initSmartTokens();
        StorageService.saveAccount(account);

        this.emit('setAccounts', this.getAccounts());
        this.selectAccount(address);
        this.refresh();
    }

    selectAccount(address) {
        StorageService.selectAccount(address);
        NodeService.setAddress();
        this.selectedAccount = address;
        this.emit('setAccount', address);
        this.refresh();
    }

    async selectNode(nodeID) {
        NodeService.selectNode(nodeID);

        Object.values(this.accounts).forEach(account => (
            account.reset()
        ));

        const node = NodeService.getCurrentNode();

        this.emit('setNode', {
            fullNode: node.fullNode,
            solidityNode: node.solidityNode,
            eventServer: node.eventServer
        });
        //await this.refresh();
        this.emit('setAccounts', this.getAccounts());
        this.emit('setAccount', this.selectedAccount);
    }

    addNode(node) {
        this.selectNode(
            NodeService.addNode(node)
        );
    }

    deleteNode(nodeID) {
        let changed = false;
        if (nodeID === NodeService.getNodes().selected) {
            changed = true;
            const firstNodeID = Object.keys(NodeService.getNodes().nodes)[ 0 ];
            firstNodeID && this.selectNode(firstNodeID);
        }
        NodeService.deleteNode(nodeID, changed);
    }

    getAccounts() {
        const accounts = Object.entries(this.accounts).reduce((accounts, [ address, account ]) => {
            accounts[ address ] = {
                name: account.name,
                balance: account.balance + (account.stakeBalance || 0) + (account.frozenBalance || 0),
                energyUsed: account.energyUsed,
                totalEnergyWeight: account.totalEnergyWeight,
                totalEnergyLimit: account.totalEnergyLimit,
                energy: account.energy,
                netUsed: account.netUsed,
                netLimit: account.netLimit,
                tokenCount: Object.keys(account.tokens.basic).length + Object.keys(account.tokens.smart).length,
                asset: account.asset
            };

            return accounts;
        }, {});

        return accounts;
    }

    setSelectedToken(token) {
        StorageService.setSelectedToken(token);
        this.emit('setSelectedToken', token);
    }

    getSelectedToken() {
        return JSON.stringify(StorageService.selectedToken) === '{}' ? { id: 0, name: 'MCASH', amount: 0, decimals: 8 } : StorageService.selectedToken;
    }

    setLanguage(language) {
        StorageService.setLanguage(language);
        this.emit('setLanguage', language);
    }

    setSetting(setting) {
        StorageService.setSetting(setting);
        this.emit('setSetting', setting);
    }

    getLanguage() {
        return StorageService.language;
    }

    getSetting() {
        return StorageService.getSetting();
    }

    getAccountDetails(address) {
        if(!address) {
            return {
                tokens: {
                    basic: {},
                    smart: {}
                },
                type: false,
                name: false,
                address: false,
                balance: 0,
                transactions: {
                    cached: [],
                    uncached: 0
                }
            };
        }

        return this.accounts[ address ].getDetails();
    }

    getSelectedAccount() {
        if(!this.selectedAccount)
            return false;

        return this.getAccountDetails(this.selectedAccount);
    }

    getAccount(address) {
        return this.accounts[ address ];
    }

    deleteAccount() {
        delete this.accounts[ this.selectedAccount ];
        StorageService.deleteAccount(this.selectedAccount);

        this.emit('setAccounts', this.getAccounts());

        if(!Object.keys(this.accounts).length) {
            this.selectAccount(false);
            return this._setState(APP_STATE.UNLOCKED);
        }

        this.selectAccount(Object.keys(this.accounts)[ 0 ]);
    }

    async addSmartToken(token) {
        const {
            selectedAccount: address
        } = this;

        await this.accounts[ address ].addSmartToken(token);
        this.emit('setAccount', address);
    }

    getPrices() {
        return StorageService.prices;
    }

    getConfirmations() {
        return this.confirmations;
    }

    async sendMcash({ recipient, amount, memo }) {
        const result = await this.accounts[ this.selectedAccount ].sendMcash(
            recipient,
            amount,
            memo
        );
        this.refresh();
        return result;
    }

    async sendBasicToken({ recipient, amount, token, memo }) {
        const result = await this.accounts[ this.selectedAccount ].sendBasicToken(
            recipient,
            amount,
            token,
            memo
        );
        this.refresh();
        return result;
    }

    async sendSmartToken({ recipient, amount, token }) {
        const result = await this.accounts[ this.selectedAccount ].sendSmartToken(
            recipient,
            amount,
            token
        );
        this.refresh();
        return result;
    }

    async rentEnergy({ _freezeAmount, _payAmount, _days, _energyAddress }) {
        const {
            privateKey
        } = this.accounts[ this.selectedAccount ];
        try {
            const bankContractAddress = this.bankContractAddress;
            const contractInstance = await NodeService.mcashWeb.contract().at(bankContractAddress);
            const result = await contractInstance.entrustOrder(_freezeAmount, _days, _energyAddress).send(
                {
                    callValue: _payAmount,
                    shouldPollResponse: false
                },
                privateKey
            );
            return result;
        } catch(ex) {
            logger.error('Failed to rent energy:', ex);
            return Promise.reject(ex);
        }
    }

    async bankOrderNotice({ energyAddress, trxHash, requestUrl }) {
        const { data: isValid } = await axios.post(requestUrl, { receiver_address: energyAddress, trxHash } )
            .then(res => res.data)
            .catch(err => { logger.error(err); });
        if(!isValid)
            return logger.warn('Failed to get bank order data');
        return isValid;
    }

    async getBankDefaultData({ requestUrl }) {
        const { data: defaultData } = await axios(requestUrl)
            .then(res => res.data)
            .catch(err => { logger.error(err); });
        if(!defaultData)
            return logger.warn('Failed to get default data');
        return defaultData;
    }

    async isValidOverTotal ({ receiverAddress, freezeAmount, requestUrl }) {
        const { data: isValid } = await axios.get(requestUrl, { params: { receiver_address: receiverAddress, freezeAmount } })
            .then(res => res.data)
            .catch(err => { logger.error(err); });
        let isValidVal = 0;
        if(isValid) isValidVal = 0;else isValidVal = 1;
        return isValidVal;
    }

    async calculateRentCost ({ receiverAddress, freezeAmount, days, requestUrl }) {
        const { data: calculateData } = await axios.get(requestUrl, { params: { receiver_address: receiverAddress, freezeAmount, days } })
            .then(res => res.data)
            .catch(err => { logger.error(err); });
        if(!calculateData)
            return logger.warn('Failed to get payMount data');
        return calculateData;
    }

    async isValidOrderAddress({ address, requestUrl }) {
        const { data: isRentData } = await axios.get(requestUrl, { params: { receiver_address: address } })
            .then(res => res.data)
            .catch(err => { logger.error(err); });
        if(!isRentData)
            return logger.warn('Failed to get valid order address data');
        return isRentData;
    }

    async isValidOnlineAddress({ address }) {
        // const account = await NodeService.mcashWeb.mcash.getUnconfirmedAccount(address);
        const account = await NodeService.mcashWeb.mcash.getAccountResources(address);
        if(!account.totalEnergyLimit)
            return logger.warn('Failed to get online address data');
        return account;
    }

    async getBankRecordList({ address, limit, start, type, requestUrl }) {
        const { data: { data: recordData } } = await axios.get(requestUrl, { params: { receiver_address: address, limit, start, type } });
        if(!recordData)
            return logger.warn('Failed to get bank record data');
        return recordData;
    }

    //setting bank record id
    setSelectedBankRecordId(id) {
        this.accounts[ this.selectedAccount ].selectedBankRecordId = id;
        this.emit('setAccount', this.selectedAccount);
    }

    async getBankRecordDetail({ id, requestUrl }) {
        const { data: bankRecordDetail } = await axios.get(requestUrl, { params: { id } })
            .then(res => res.data)
            .catch(err => { logger.error(err); });
        if(!bankRecordDetail)
            return logger.warn('Failed to get bank record detail data');
        return bankRecordDetail;
    }

    changeDealCurrencyPage(status) { // change deal currency page status
        console.log(`STATUS改成了${status}`);
        this.accounts[ this.selectedAccount ].dealCurrencyPage = status;
        this.emit('setAccount', this.selectedAccount);
    }

    exportAccount() {
        const {
            mnemonic,
            privateKey
        } = this.accounts[ this.selectedAccount ];

        return {
            mnemonic: mnemonic || false,
            privateKey
        };
    }

    mapTokenData (items, tokenMap, key = 'asset_id') {
        if (Array.isArray(items) && tokenMap) {
            return items.map(obj => {
                const token = typeof obj[ key ] !== 'undefined' ? tokenMap[ obj[ key ] ] : {};
                const newObj = { ...obj, token };
                if (typeof obj.token_id !== 'undefined' && token && token.nft_token_map)
                    newObj.nftToken = token.nft_token_map[ obj.token_id ];
                return newObj;
            });
        }
        return [];
    }

    mapAssetTokenData (result) {
        return result ? this.mapTokenData(result.items, result.token_map, 'asset_id') : [];
    }

    mapContractTokenData (result) {
        return result ? this.mapTokenData(result.items, result.token_map, 'contract_address') : [];
    }

    async getTransactionsByTokenId({ tokenId, start = 0, direction = 'all', type = '' }) {
        try {
            const node = NodeService.getCurrentNode();
            const baseApiUrl = (node && node.mcashScanApi) ? node.mcashScanApi : 'https://api.mcashscan.io';
            //
            const address = this.selectedAccount;
            const limit = 30;
            let params = { limit, start: limit * start };
            if (direction === 'all')
                params = { ...params, address };
            else if (direction === 'to') {
                // sender
                params = { ...params, from_address: address };
            } else {
                // receiver
                params = { ...params, to_address: address };
            }
            if(!isNaN(tokenId)) {
                params.asset_id = tokenId || 0;
                if (type)
                    params.type = type;
                const { data = {} } = await axios.get(`${baseApiUrl}/api/transactions`, {
                    params,
                    timeout: 10000
                }).catch(() => {
                    return { data: { items: [], total: 0 } };
                });
                return { records: this.mapAssetTokenData(data), total: (data && data.total) || 0 };
            }
            params.contract_address = tokenId;
            const { data } = await axios.get(`${baseApiUrl}/api/token_transfers`, {
                params,
                timeout: 10000
            }).catch(() => {
                return { data: { items: [], total: 0 } };
            });
            return { records: this.mapContractTokenData(data), total: (data && data.total) || 0 };
        } catch (e) {
            console.error('Error - getTransactionsByTokenId:', e);
        }
    }

    async getNews() {
        // const developmentMode = StorageService.setting.developmentMode;
        // //const apiUrl = developmentMode? 'http://52.14.133.221:8920':'https://list.tronlink.org';
        // const apiUrl = developmentMode ? 'https://list.tronlink.org' : 'https://list.tronlink.org';
        // const res = await axios.get(apiUrl+'/api/activity/announcement/reveal_v2').catch(e=>false);
        // if(res) {
        //     return res.data.data;
        // } else {
        //     return [];
        // }
        return [];
    }

    async getIeos() {
        // const developmentMode = StorageService.setting.developmentMode;
        // //const apiUrl = developmentMode? 'http://172.16.22.43:8090':'https://list.tronlink.org';
        // const apiUrl = developmentMode ? 'https://list.tronlink.org' : 'https://list.tronlink.org';
        // const res = await axios.get(apiUrl+'/api/wallet/ieo').catch(e=>false);
        // if(res) {
        //     return res.data.data;
        // } else {
        //     return [];
        // }
        return [];
    }

    async addCount(id) {
        // const developmentMode = StorageService.setting.developmentMode;
        // //const apiUrl = developmentMode? 'http://52.14.133.221:8920':'https://list.tronlink.org';
        // const apiUrl = developmentMode ? 'https://list.tronlink.org' : 'https://list.tronlink.org';
        // const res = await axios.post(apiUrl+'/api/activity/announcement/pv',{id}).catch(e=>false);
        // if(res && res.data.code === 0) {
        //     return true;
        // } else {
        //     return false;
        // }
        return true;
    }

    async setAirdropInfo(address) {
        // const developmentMode = StorageService.setting.developmentMode;
        // //const apiUrl = developmentMode? 'http://52.14.133.221:8951':'https://list.tronlink.org';
        // const apiUrl = 'https://list.tronlink.org';
        // const hexAddress = McashWeb.address.toHex(address);
        // const res = await axios.get(apiUrl + '/api/wallet/airdrop_transaction',{params:{address:hexAddress}}).catch(e=>false);
        // if(res && res.data.code === 0) {
        //     this.accounts[ this.selectedAccount ].airdropInfo = res.data.data;
        //     this.emit('setAirdropInfo', res.data.data);
        // }
    }

    async getDappList(isFromStorage = false) {
        return await StorageService.getDappList(isFromStorage);
    }

    async setDappList(dappList) {
        await StorageService.saveDappList(dappList);
        this.emit('setDappList', dappList);
    }

    async getAccountInfo(address) {
        return await NodeService.mcashWeb.mcash.getUnconfirmedAccount(address);
    }

    setGaEvent({ eventCategory, eventAction, eventLabel, referrer }) {
        ga('send', 'event', {
            eventCategory,
            eventAction,
            eventLabel,
            referrer,
            userId: Utils.hash(McashWeb.address.toHex(this.selectedAccount))
        });
    }

    getAllDapps() {
        return StorageService.hasOwnProperty('allDapps') ? StorageService.allDapps : [];
    }

    async createAccount({ accountAddress }) {
        await this.accounts[ this.selectedAccount ].createAccount(accountAddress);
        this.refresh();
    }

    closeActivationPrompt() {
        this.accounts[ this.selectedAccount ].closeActivationPrompt();
    }
}
export default Wallet;
