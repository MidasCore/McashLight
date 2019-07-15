import extensionizer from 'extensionizer';
import Logger from '@mcashlight/lib/logger';
import Utils from '@mcashlight/lib/utils';
import NodeService from '../NodeService';
import axios from "axios";
const logger = new Logger('StorageService');

const StorageService = {
    // We could instead scope the data so we don't need this array
    storageKeys: [
        'accounts',
        'nodes',
        'transactions',
        'selectedAccount',
        'prices',
        'pendingTransactions',
        'tokenCache',
        'setting',
        'language',
        'dappList'
    ],

    storage: extensionizer.storage && extensionizer.storage.local,

    prices: {
        priceList: {
            USD: 0,
            BTC: 0,
            ETH: 0
        },
        selected: 'USD'
    },
    nodes: {
        nodeList: {},
        selectedNode: false
    },
    pendingTransactions: {},
    accounts: {},
    transactions: {},
    tokenCache: {},
    selectedAccount: false,
    selectedToken: {},
    setting: {
        lock: {
            lockTime: 0,
            duration: 0
        },
        openAccountsMenu:false,
        advertising: {},
        developmentMode: location.hostname !== 'ibnejdfjmmkpcnlpebklmnkoeoihofec'
    },
    language: '',
    ready: false,
    password: false,
    dappList: {
        recommend: [],
        used: []
    },
    allDapps: [],

    get needsMigrating() {
        return localStorage.hasOwnProperty('McashLink_WALLET');
    },

    get hasAccounts() {
        return Object.keys(this.accounts).length;
    },

    getStorage(key) {
        return new Promise(resolve => (
            this.storage.get(key, data => {
                if(key in data)
                    return resolve(data[ key ]);

                resolve(false);
            })
        ));
    },

    async dataExists() {
        return !!(await this.getStorage('accounts'));
    },

    lock() {
        this.ready = false;
    },

    async unlock(password) {
        if(this.ready) {
            logger.error('Attempted to decrypt data whilst already unencrypted');
            return 'ERRORS.ALREADY_UNLOCKED';
        }

        if(!await this.dataExists())
            return 'ERRORS.NOT_SETUP';

        try {
            for(let i = 0; i < this.storageKeys.length; i++) {
                const key = this.storageKeys[ i ];
                const encrypted = await this.getStorage(key);

                if(!encrypted)
                    continue;

                this[ key ] = Utils.decrypt(
                    encrypted,
                    password
                );
            }
        } catch(ex) {
            logger.warn('Failed to decrypt wallet (wrong password?):', ex);
            return 'ERRORS.INVALID_PASSWORD';
        }

        logger.info('Decrypted wallet data');

        this.password = password;
        this.ready = true;

        return false;
    },

    async verify(password) {
        try {
            for(let i = 0; i < this.storageKeys.length; i++) {
                const key = this.storageKeys[ i ];
                const encrypted = await this.getStorage(key);

                if(!encrypted)
                    continue;

                Utils.decrypt(
                    encrypted,
                    password
                );
            }
        } catch(ex) {
            logger.warn('Failed to decrypt wallet (wrong password?):', ex);
            return 'ERRORS.INVALID_PASSWORD';
        }

        return false;
    },

    hasAccount(address) {
        // This is the most disgusting piece of code I've ever written.
        return (address in this.accounts);
    },

    selectAccount(address) {
        logger.info(`Storing selected account: ${ address }`);

        this.selectedAccount = address;
        this.save('selectedAccount');
    },

    getAccounts() {
        const accounts = {};

        Object.keys(this.accounts).forEach(address => {
            accounts[ address ] = {
                transactions: this.transactions[ address ] || [],
                ...this.accounts[ address ]
            };
        });

        return accounts;
    },

    getAccount(address) {
        const account = this.accounts[ address ];
        const transactions = this.transactions[ address ] || [];

        return {
            transactions,
            ...account
        };
    },

    deleteAccount(address) {
        logger.info('Deleting account', address);

        delete this.accounts[ address ];
        delete this.transactions[ address ];

        this.save('accounts', 'transactions');
    },

    deleteNode(nodeID) {
        logger.info('Deleting node', nodeID);

        delete this.nodes.nodeList[ nodeID ];
        this.save('nodes');
    },

    saveNode(nodeID, node) {
        logger.info('Saving node', node);

        this.nodes.nodeList[ nodeID ] = node;
        this.save('nodes');
    },

    selectNode(nodeID) {
        logger.info('Saving selected node', nodeID);

        this.nodes.selectedNode = nodeID;
        this.save('nodes');
    },

    saveAccount(account) {
        logger.info('Saving account', account);

        const {
            transactions,
            ...remaining // eslint-disable-line
        } = account;

        this.transactions[ account.address ] = transactions;
        this.accounts[ account.address ] = remaining;

        this.save('transactions', 'accounts');
    },

    setSelectedToken(token) {
        logger.info('Saving selectedToken', token);
        this.selectedToken = token;
        this.save('selectedToken');
    },

    setLanguage(language){
        logger.info('Saving language', language);
        this.language = language;
        this.save('language');
    },

    setSetting(setting){
        logger.info('Saving setting', setting);
        this.setting = setting;
        this.save('setting');
    },

    getSetting(){
        if(!this.setting.hasOwnProperty('advertising')){
            this.setting.advertising = {};
        }
        return {...this.setting,developmentMode:location.hostname !== 'ibnejdfjmmkpcnlpebklmnkoeoihofec'};
    },

    migrate() {
        try {
            const storage = localStorage.getItem('McashLink_WALLET');
            const decrypted = Utils.decrypt(
                JSON.parse(storage),
                this.password
            );

            const {
                accounts,
                currentAccount
            } = decrypted;

            return {
                accounts: Object.values(accounts).map(({ privateKey, name }) => ({
                    privateKey,
                    name
                })),
                selectedAccount: currentAccount
            };
        } catch(ex) {
            logger.info('Failed to migrate (wrong password?):', ex);

            return {
                error: true
            };
        }
    },

    authenticate(password) {
        this.password = password;
        this.ready = true;

        logger.info('Set storage password');
    },

    addPendingTransaction(address, txID) {
        if(!(address in this.pendingTransactions))
            this.pendingTransactions[ address ] = [];

        if(this.pendingTransactions[ address ].some(tx => tx.txID === txID))
            return;

        logger.info('Adding pending transaction:', { address, txID });

        this.pendingTransactions[ address ].push({
            nextCheck: Date.now() + 5000,
            txID
        });

        this.save('pendingTransactions');
    },

    removePendingTransaction(address, txID) {
        if(!(address in this.pendingTransactions))
            return;

        logger.info('Removing pending transaction:', { address, txID });

        this.pendingTransactions[ address ] = this.pendingTransactions[ address ].filter(transaction => (
            transaction.txID !== txID
        ));

        if(!this.pendingTransactions[ address ].length)
            delete this.pendingTransactions[ address ];

        this.save('pendingTransactions');
    },

    getNextPendingTransaction(address) {
        if(!(address in this.pendingTransactions))
            return false;

        const [ transaction ] = this.pendingTransactions[ address ];

        if(!transaction)
            return false;

        if(transaction.nextCheck < Date.now())
            return false;

        return transaction.txID;
    },

    setPrices(priceList) {
        this.prices.priceList = priceList;
        this.save('prices');
    },

    selectCurrency(currency) {
        this.prices.selected = currency;
        this.save('prices');
    },

    save(...keys) {
        if(!this.ready)
            return logger.error('Attempted to write storage when not ready');

        if(!keys.length)
            keys = this.storageKeys;

        logger.info(`Writing storage for keys ${ keys.join(', ') }`);

        keys.forEach(key => (
            this.storage.set({
                [ key ]: Utils.encrypt(this[ key ], this.password)
            })
        ));

        logger.info('Storage saved');
    },

    async cacheToken(tokenID) {

        // if(NodeService.getNodes().selected === 'f0b1e38e-7bee-485e-9d3f-69410bf30681') {
        //     if(typeof tokenID === 'string' ){
        //         if(tokenID === 0){
        //            this.tokenCache[ tokenID ] = {
        //                 name: 'MCASH',
        //                 abbr: 'MCASH',
        //                 decimals: 8
        //             };
        //         }else{
        //             const {data} = await axios.get('https://apilist.tronscan.org/api/token', {params:{id:tokenID,showAll:1}});
        //             const {
        //                 name,
        //                 abbr,
        //                 precision: decimals = 0,
        //                 imgUrl=false
        //             } = data.data[0];
        //             this.tokenCache[ tokenID ] = {
        //                 name,
        //                 abbr,
        //                 decimals,
        //                 imgUrl
        //             };
        //         }
        //     } else {
        //         const {contract_address,decimals,name,abbr} = tokenID;
        //         const {data:{trc20_tokens:[{icon_url=false}]}} = await axios.get('https://apilist.tronscan.org/api/token_trc20?contract=' + contract_address);
        //         this.tokenCache[ contract_address ] = {
        //             name,
        //             abbr,
        //             decimals,
        //             imgUrl:icon_url
        //         };
        //     }
        //
        // }else{
        //     const {
        //         name,
        //         abbr,
        //         precision: decimals = 0
        //     } = await NodeService.mcashWeb.mcash.getTokenById(tokenID);
        //     this.tokenCache[ tokenID ] = {
        //         name,
        //         abbr,
        //         decimals
        //     };
        // }
        const {
            name,
            abbr,
            precision: decimals = 0
        } = await NodeService.mcashWeb.mcash.getTokenById(tokenID);
        this.tokenCache[ tokenID ] = {
            name,
            abbr,
            decimals
        };

        logger.info(`Cached token ${ tokenID }:`, this.tokenCache[ tokenID ]);

        this.save('tokenCache');
    },

    async getDappList(isFromStorage) {
        // if(!this.hasOwnProperty('dappList')) {
        //     this.dappList = { recommend: [], used: [] };
        // }
        // if(!isFromStorage) {
        //     const { data: { data: recommend } } = await axios.get('https://list.tronlink.org/dapphouseapp/plug').catch(e => {
        //         return { data: { data: this.dappList.recommend } };
        //     });
        //     this.dappList.recommend = recommend;
        // }
        // const used = this.dappList.used.filter(v => v != null);
        // this.dappList.used = used;
        // this.save('dappList');
        // return this.dappList;
        return [];
    },

    saveDappList(dappList) {
        this.dappList = dappList;
        this.save('dappList');
    },

    saveAllDapps(dapps) {
        this.allDapps = dapps;
        this.save('allDapps');
    },

    purge() {
        logger.warn('Purging McashLight. This will remove all stored transaction data');

        this.storage.set({
            transactions: Utils.encrypt({}, this.password)
        });

        logger.info('Purge complete. Please reload McashLight');
    }
};

export default StorageService;
