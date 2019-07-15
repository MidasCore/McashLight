import Logger from '@mcashlight/lib/logger';
import MessageDuplex from '@mcashlight/lib/MessageDuplex';
import NodeService from './services/NodeService';
import StorageService from './services/StorageService';
import WalletService from './services/WalletService';
import Utils from '@mcashlight/lib/utils';
import transactionBuilder from '@mcashlight/lib/transactionBuilder';
import McashWeb from 'mcashweb';

import * as Sentry from '@sentry/browser';

import { CONFIRMATION_TYPE } from '@mcashlight/lib/constants';
import { BackgroundAPI } from '@mcashlight/lib/api';
import { version } from './package.json';

// Make error reporting user-configurable
// Sentry.init({
//     dsn: 'https://5d5f88b4905844f9a1be3d380f5569a8@sentry.io/1455160',
//     release: `McashLight@${ version }`
// });

const duplex = new MessageDuplex.Host();
const logger = new Logger('backgroundScript');

const backgroundScript = {
    walletService: Utils.requestHandler(
        new WalletService()
    ),

    developmentMode: location.hostname !== 'ibnejdfjmmkpcnlpebklmnkoeoihofec',
    nodeService: Utils.requestHandler(NodeService),

    run() {
        BackgroundAPI.init(duplex);

        this.bindAnalytics();
        this.bindPopupDuplex();
        this.bindTabDuplex();
        this.bindWalletEvents();
    },

    bindAnalytics() {
        (function(i, s, o, g, r, a, m) {
            i.GoogleAnalyticsObject = r;

            i[ r ] = i[ r ] || function() {
                (i[ r ].q = i[ r ].q || []).push(arguments);
            }, i[ r ].l = 1 * new Date();

            a = s.createElement(o),
            m = s.getElementsByTagName(o)[ 0 ];

            a.async = 1;
            a.src = g;

            m.parentNode.insertBefore(a, m);
        })(window, document, 'script', (this.developmentMode ?
            //'https://www.google-analytics.com/analytics_debug.js' :
            'https://www.google-analytics.com/analytics.js' :
            'https://www.google-analytics.com/analytics.js'
        ), 'ga');

        ga('create', 'UA-126129673-2', 'auto');
        ga('send', 'pageview');
        ga('set', 'checkProtocolTask', null);
        ga('set', 'appName', 'McashLight');
        ga('set', 'appVersion', version);
    },

    bindPopupDuplex() {
        // Popup Handling (For transaction polling)
        duplex.on('popup:connect', () => (
            this.walletService.startPolling()
        ));

        duplex.on('popup:disconnect', () => (
            this.walletService.stopPolling()
        ));

        //refresh the wallet data
        duplex.on('refresh', this.walletService.refresh);

        // Getter methods
        duplex.on('requestState', ({ resolve }) => resolve(
            this.walletService.state
        ));

        //get the transaction records of token that need to selected
        duplex.on('setSelectedToken', this.walletService.setSelectedToken);
        duplex.on('getSelectedToken', this.walletService.getSelectedToken);

        // WalletService: Confirmation responses
        duplex.on('acceptConfirmation', this.walletService.acceptConfirmation);
        duplex.on('rejectConfirmation', this.walletService.rejectConfirmation);

        // WalletService: BLockchain actions
        duplex.on('sendMcash', this.walletService.sendMcash);
        duplex.on('sendBasicToken', this.walletService.sendBasicToken);
        duplex.on('sendSmartToken', this.walletService.sendSmartToken);
        duplex.on('getPrices', this.walletService.getPrices);

        // WalletService: Account management / migration
        duplex.on('addAccount', this.walletService.addAccount);
        duplex.on('selectAccount', this.walletService.selectAccount);
        duplex.on('getAccountDetails', this.walletService.getAccountDetails);
        duplex.on('getAccounts', this.walletService.getAccounts);
        duplex.on('importAccount', this.walletService.importAccount);
        duplex.on('getSelectedAccount', this.walletService.getSelectedAccount);
        duplex.on('addSmartToken', this.walletService.addSmartToken);
        duplex.on('getConfirmations', this.walletService.getConfirmations);
        duplex.on('selectCurrency', this.walletService.selectCurrency);
        duplex.on('deleteAccount', this.walletService.deleteAccount);
        duplex.on('exportAccount', this.walletService.exportAccount);

        // WalletService: State management
        duplex.on('changeState', this.walletService.changeState);
        duplex.on('resetState', this.walletService.resetState);

        // WalletService: Authentication
        duplex.on('setPassword', this.walletService.setPassword);
        duplex.on('unlockWallet', this.walletService.unlockWallet);
        duplex.on('lockWallet', this.walletService.lockWallet);
        duplex.on('verifyPassword', this.walletService.verifyPassword);

        // NodeService: Node management
        duplex.on('selectNode', this.walletService.selectNode);
        duplex.on('addNode', this.walletService.addNode);
        // duplex.on('deleteNode', this.nodeService.deleteNode);
        duplex.on('getNodes', this.nodeService.getNodes);
        duplex.on('getSmartToken', this.nodeService.getSmartToken);

        // language
        duplex.on('getLanguage', this.walletService.getLanguage);
        duplex.on('setLanguage', this.walletService.setLanguage);
        //setting
        duplex.on('getSetting', this.walletService.getSetting);
        duplex.on('setSetting', this.walletService.setSetting);

        duplex.on('getTransactionsByTokenId', this.walletService.getTransactionsByTokenId);

        // mcashBank energy
        duplex.on('rentEnergy', this.walletService.rentEnergy);
        duplex.on('isValidOverTotal', this.walletService.isValidOverTotal);
        duplex.on('getBankDefaultData', this.walletService.getBankDefaultData);
        duplex.on('calculateRentCost', this.walletService.calculateRentCost);
        duplex.on('isValidOrderAddress', this.walletService.isValidOrderAddress);
        duplex.on('isValidOnlineAddress', this.walletService.isValidOnlineAddress);
        duplex.on('getBankRecordList', this.walletService.getBankRecordList);
        duplex.on('getBankRecordDetail', this.walletService.getBankRecordDetail);
        duplex.on('setSelectedBankRecordId', this.walletService.setSelectedBankRecordId);
        duplex.on('changeDealCurrencyPage', this.walletService.changeDealCurrencyPage);
        duplex.on('bankOrderNotice', this.walletService.bankOrderNotice);

        duplex.on('getNews', this.walletService.getNews);
        duplex.on('getIeos', this.walletService.getIeos);
        duplex.on('addCount', this.walletService.addCount);

        duplex.on('setAirdropInfo', this.walletService.setAirdropInfo);
        duplex.on('getDappList', this.walletService.getDappList);
        duplex.on('setDappList', this.walletService.setDappList);
        duplex.on('getAccountInfo', this.walletService.getAccountInfo);

        duplex.on('setGaEvent', this.walletService.setGaEvent);
        duplex.on('getAllDapps', this.walletService.getAllDapps);

        // active account
        duplex.on('createAccount', this.walletService.createAccount);
        duplex.on('closeActivationPrompt', this.walletService.closeActivationPrompt);
    },

    bindTabDuplex() {
        duplex.on('tabRequest', async ({ hostname, resolve, data: { action, data, uuid } }) => {
            // Abstract this so we can just do resolve(data) or reject(data)
            // and it will map to { success, data, uuid }

            switch(action) {
                case 'init': {
                    const response = {
                        address: false,
                        node: {
                            fullNode: false,
                            solidityNode: false,
                            eventServer: false
                        }
                    };

                    if(StorageService.ready) {
                        const node = NodeService.getCurrentNode();

                        response.address = this.walletService.selectedAccount;
                        response.node = {
                            fullNode: node.fullNode,
                            solidityNode: node.solidityNode,
                            eventServer: node.eventServer
                        };
                    }

                    resolve({
                        success: true,
                        data: response,
                        uuid
                    });

                    break;
                } case 'sign': {
                    if(!this.walletService.selectedAccount) {
                        return resolve({
                            success: false,
                            data: 'User has not unlocked wallet',
                            uuid
                        });
                    }

                    try {
                        const {
                            transaction,
                            input
                        } = data;

                        const {
                            selectedAccount
                        } = this.walletService;

                        const mcashWeb = NodeService.mcashWeb;
                        const account = this.walletService.getAccount(selectedAccount);

                        if(typeof input === 'string') {
                            const signedTransaction = await account.sign(input);

                            return this.walletService.queueConfirmation({
                                type: CONFIRMATION_TYPE.STRING,
                                hostname,
                                signedTransaction,
                                input
                            }, uuid, resolve);
                        }

                        const contractType = transaction.raw_data.contract[ 0 ].type;

                        const {
                            mapped,
                            error
                        } = await transactionBuilder(mcashWeb, contractType, input); // NodeService.getCurrentNode()

                        if(error) {
                            return resolve({
                                success: false,
                                data: 'Invalid transaction provided',
                                uuid
                            });
                        }

                        const signedTransaction = await account.sign(
                            mapped.transaction ||
                            mapped
                        );

                        const whitelist = this.walletService.contractWhitelist[ input.contract_address ];

                        if(contractType === 'TriggerSmartContract') {
                            const value = input.call_value || 0;

                            ga('send', 'event', {
                                eventCategory: 'Smart Contract',
                                eventAction: 'Used Smart Contract',
                                eventLabel: McashWeb.address.fromHex(input.contract_address),
                                eventValue: value,
                                referrer: hostname,
                                userId: Utils.hash(input.owner_address)
                            });
                        }

                        if(contractType === 'TriggerSmartContract' && whitelist) {
                            const expiration = whitelist[ hostname ];

                            if(expiration === -1 || expiration >= Date.now()) {
                                logger.info('Automatically signing transaction', signedTransaction);

                                return resolve({
                                    success: true,
                                    data: signedTransaction,
                                    uuid
                                });
                            }
                        }

                        this.walletService.queueConfirmation({
                            type: CONFIRMATION_TYPE.TRANSACTION,
                            hostname,
                            signedTransaction,
                            contractType,
                            input
                        }, uuid, resolve);
                    } catch(ex) {
                        logger.error('Failed to sign transaction:', ex);

                        return resolve({
                            success: false,
                            data: 'Invalid transaction provided',
                            uuid
                        });
                    }
                    break;
                } default:
                    resolve({
                        success: false,
                        data: 'Unknown method called',
                        uuid
                    });
                    break;
            }
        });
    },

    bindWalletEvents() {
        this.walletService.on('newState', appState => (
            BackgroundAPI.setState(appState)
        ));

        this.walletService.on('setAccount', address => BackgroundAPI.setAccount(
            this.walletService.getAccountDetails(address)
        ));

        this.walletService.on('setNode', node => (
            BackgroundAPI.setNode(node)
        ));

        this.walletService.on('setAccounts', accounts => (
            BackgroundAPI.setAccounts(accounts)
        ));

        this.walletService.on('setConfirmations', confirmations => (
            BackgroundAPI.setConfirmations(confirmations)
        ));

        this.walletService.on('setPriceList', priceList => (
            BackgroundAPI.setPriceList(priceList)
        ));

        this.walletService.on('setCurrency', currency => (
            BackgroundAPI.setCurrency(currency)
        ));

        this.walletService.on('setSelectedToken', token => (
            BackgroundAPI.setSelectedToken(token)
        ));

        this.walletService.on('setLanguage', language => (
            BackgroundAPI.setLanguage(language)
        ));

        this.walletService.on('setSetting', setting => (
            BackgroundAPI.setSetting(setting)
        ));

        this.walletService.on('setSelectedBankRecordId', id => (
            BackgroundAPI.setSelectedBankRecordId(id)
        ));

        this.walletService.on('changeDealCurrencyPage', status => (
            BackgroundAPI.changeDealCurrencyPage(status)
        ));

        this.walletService.on('setAirdropInfo', airdropInfo => (
            BackgroundAPI.setAirdropInfo(airdropInfo)
        ));

        this.walletService.on('setDappList', dappList => (
            BackgroundAPI.setDappList(dappList)
        ));
    }
};

backgroundScript.run();
