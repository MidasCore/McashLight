import StorageService from '../StorageService';
import randomUUID from 'uuid/v4';
import McashWeb from 'mcashweb';
import Logger from '@mcashlight/lib/logger';

import { BigNumber } from 'bignumber.js';

const logger = new Logger('NodeService');

const NodeService = {
    _nodes: {
        // https://www.uuidgenerator.net/
        '6be34522-8ad5-4631-b785-755ea7d870d8': {
            name: 'Mainnet',
            fullNode: 'https://mainnet.mcash.network',
            solidityNode: 'https://mainnet.mcash.network',
            // eventServer: 'https://mainnet.mcash.network',
            mcashScanApi: 'https://api.mcashscan.io',
            mcashScanExplorer: 'https://mcashscan.io/#',
            default: true,
            readOnly: true
        },
        '6739be94-ee43-46af-9a62-690cf0947269': {
            name: 'Testnet',
            fullNode: 'https://testnet.mcash.network',
            solidityNode: 'https://testnet.mcash.network',
            // eventServer: 'https://rpc.testnet.mcash.network',
            mcashScanApi: 'https://api-testnet.mcashscan.io',
            mcashScanExplorer: 'https://testnet.mcashscan.io/#',
            default: false,
            readOnly: true
        },
        '72752377-8f6d-4f3b-9ee4-30dfce4cec63': {
            name: 'Zeronet',
            fullNode: 'https://zeronet.mcash.network',
            solidityNode: 'https://zeronet.mcash.network',
            mcashScanApi: 'https://api-zeronet.mcashscan.io',
            mcashScanExplorer: 'https://zeronet.mcashscan.io/#',
            readOnly: true
        }
    },

    _selectedNode: '6be34522-8ad5-4631-b785-755ea7d870d8',
    // TESTNET: _selectedNode: '6739be94-ee43-46af-9a62-690cf0947269',

    _read() {
        logger.info('Reading nodes from storage');

        const {
            nodeList = {},
            selectedNode = false
        } = StorageService.nodes;

        this._nodes = {
            ...this._nodes,
            ...nodeList
        };

        if(selectedNode)
            this._selectedNode = selectedNode;
    },

    init() {
        this._read();
        this._updateMcashWeb();
    },

    _updateMcashWeb(skipAddress = false) {
        const {
            fullNode,
            solidityNode,
            eventServer
        } = this.getCurrentNode();

        this.mcashWeb = new McashWeb(
            fullNode,
            solidityNode,
            eventServer
        );

        if(!skipAddress)
            this.setAddress();
    },

    setAddress() {
        if(!this.mcashWeb)
            this._updateMcashWeb();

        if(!StorageService.selectedAccount)
            return this._updateMcashWeb(true);

        this.mcashWeb.setAddress(
            StorageService.selectedAccount
        );
    },

    save() {
        Object.entries(this._nodes).forEach(([ nodeID, node ]) => (
            StorageService.saveNode(nodeID, node)
        ));

        StorageService.selectNode(this._selectedNode);
        this._updateMcashWeb();
    },

    getNodes() {
        return {
            nodes: this._nodes,
            selected: this._selectedNode
        };
    },

    getCurrentNode() {
        return this._nodes[ this._selectedNode ];
    },

    selectNode(nodeID) {
        StorageService.selectNode(nodeID);

        this._selectedNode = nodeID;
        this._updateMcashWeb();
    },

    addNode(node) {
        const nodeID = randomUUID();

        this._nodes[ nodeID ] = {
            ...node,
            default: false
        };

        this.save();
        return nodeID;
    },

    deleteNode(nodeID, changedSelectedNode = false) {
        if (this._nodes[ nodeID ]) {
            delete this._nodes[ nodeID ];
            StorageService.deleteNode(nodeID);
            if (changedSelectedNode) {
                StorageService.selectNode(this._selectedNode);
                this._updateMcashWeb();
            }
        }
    },

    async getSmartToken(address) {
        try {
            const contract = await this.mcashWeb.contract().at(address);

            if(!contract.name && !contract.symbol && !contract.decimals)
                return false;
            const d = await contract.decimals().call();
            const name = await contract.name().call();
            const symbol = await contract.symbol().call();
            const decimals = typeof d === 'object' && d._decimals ? d : new BigNumber(d).toNumber();
            return {
                name: typeof name === 'object' ? name._name : name,
                symbol: typeof symbol === 'object' ? symbol._symbol : symbol,
                decimals: typeof decimals === 'object' ? decimals._decimals : decimals
            };
        } catch(ex) {
            logger.error(`Failed to fetch token ${ address }:`, ex);
            return false;
        }
    },

    getBasicToken(tokenId) {
        try {
            return this.mcashWeb.mcash.getTokenById(tokenId);
        } catch(ex) {
            logger.error(`Failed to fetch token ${ tokenId }:`, ex);
            return false;
        }
    },

    getPriceApiUrl(fromCodes) {
        if (this._selectedNode === '6be34522-8ad5-4631-b785-755ea7d870d8')
            return `https://api.midasprotocol.com/token/v1/prices?fromCodes=${fromCodes}&toCodes=USD,BTC,ETH`;
        return '';
    }
};

export default NodeService;
