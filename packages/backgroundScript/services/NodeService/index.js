import StorageService from '../StorageService';
import randomUUID from 'uuid/v4';
import McashWeb from 'mcashweb';
import Logger from '@mcashlight/lib/logger';

import { BigNumber } from 'bignumber.js';

const logger = new Logger('NodeService');

const NodeService = {
    _nodes: {
        '6be34522-8ad5-4631-b785-755ea7d870d8': {
            name: 'Mainnet',
            fullNode: 'https://mainnet.mcash.network',
            solidityNode: 'https://mainnet.mcash.network',
            // eventServer: 'https://mainnet.mcash.network',
            mcashScan: 'https://api.mcashscan.io',
            // hideApi: true,
            default: true
        },
        '6739be94-ee43-46af-9a62-690cf0947269': {
            name: 'Testnet',
            fullNode: 'https://testnet.mcash.network',
            solidityNode: 'https://testnet.mcash.network',
            // eventServer: 'https://rpc.testnet.mcash.network',
            mcashScan: 'https://api.testnet.mcash.network',
            // hideApi: true,
            default: false
        },
        // 'f0b1e38e-7bee-485e-9d3f-69410bf30681': {
        //     name: 'Mainnet',
        //     fullNode: '',
        //     solidityNode: '',
        //     eventServer: '',
        //     default: false
        // }
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
        this._updateTronWeb();
    },

    _updateTronWeb(skipAddress = false) {
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
            this._updateTronWeb();

        if(!StorageService.selectedAccount)
            return this._updateTronWeb(true);

        this.mcashWeb.setAddress(
            StorageService.selectedAccount
        );
    },

    save() {
        Object.entries(this._nodes).forEach(([ nodeID, node ]) => (
            StorageService.saveNode(nodeID, node)
        ));

        StorageService.selectNode(this._selectedNode);
        this._updateTronWeb();
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
        this._updateTronWeb();
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
                name: typeof name === 'object' ? name._name: name,
                symbol: typeof symbol === 'object' ? symbol._symbol: symbol,
                decimals: typeof decimals === 'object' ? decimals._decimals: decimals
            };
        } catch(ex) {
            logger.error(`Failed to fetch token ${ address }:`, ex);
            return false;
        }
    }
};

export default NodeService;
