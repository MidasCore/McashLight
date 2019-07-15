import EventChannel from '@mcashlight/lib/EventChannel';
import Logger from '@mcashlight/lib/logger';
import McashWeb from 'mcashweb';
import Utils from '@mcashlight/lib/utils';
import RequestHandler from './handlers/RequestHandler';
import ProxiedProvider from './handlers/ProxiedProvider';

const logger = new Logger('pageHook');

const pageHook = {
    proxiedMethods: {
        setAddress: false,
        sign: false
    },

    init() {
        this._bindTronWeb();
        this._bindEventChannel();
        this._bindEvents();

        this.request('init').then(({ address, node }) => {
            if(address)
                this.setAddress(address);

            if(node.fullNode)
                this.setNode(node);

            logger.info('McashLight initiated');
        }).catch(err => {
            logger.info('Failed to initialise McashWeb', err);
        });
    },

    _bindTronWeb() {
        if(window.mcashWeb !== undefined)
            logger.warn('McashWeb is already initiated. McashLight will overwrite the current instance');

        const mcashWeb = new McashWeb(
            new ProxiedProvider(),
            new ProxiedProvider(),
            new ProxiedProvider()
        );

        this.proxiedMethods = {
            setAddress: mcashWeb.setAddress.bind(mcashWeb),
            sign: mcashWeb.mcash.sign.bind(mcashWeb)
        };

        [ 'setPrivateKey', 'setAddress', 'setFullNode', 'setSolidityNode', 'setEventServer' ].forEach(method => (
            mcashWeb[ method ] = () => new Error('McashLight has disabled this method')
        ));

        mcashWeb.mcash.sign = (...args) => (
            this.sign(...args)
        );

        window.mcashWeb = mcashWeb;
    },

    _bindEventChannel() {
        this.eventChannel = new EventChannel('pageHook');
        this.request = RequestHandler.init(this.eventChannel);
    },

    _bindEvents() {
        this.eventChannel.on('setAccount', address => (
            this.setAddress(address)
        ));

        this.eventChannel.on('setNode', node => (
            this.setNode(node)
        ));
    },

    setAddress(address) {
        // logger.info('McashLight: New address configured');

        this.proxiedMethods.setAddress(address);
        mcashWeb.ready = true;
    },

    setNode(node) {
        // logger.info('McashLight: New node configured');

        mcashWeb.fullNode.configure(node.fullNode);
        mcashWeb.solidityNode.configure(node.solidityNode);
        mcashWeb.eventServer.configure(node.eventServer);
    },

    sign(transaction, privateKey = false, useTronHeader = true, callback = false) {
        if(Utils.isFunction(privateKey)) {
            callback = privateKey;
            privateKey = false;
        }

        if(Utils.isFunction(useTronHeader)) {
            callback = useTronHeader;
            useTronHeader = true;
        }

        if(!callback)
            return Utils.injectPromise(this.sign.bind(this), transaction, privateKey, useTronHeader);

        if(privateKey)
            return this.proxiedMethods.sign(transaction, privateKey, useTronHeader, callback);

        if(!transaction)
            return callback('Invalid transaction provided');

        if(!mcashWeb.ready)
            return callback('User has not unlocked wallet');

        this.request('sign', {
            transaction,
            useTronHeader,
            input: (
                typeof transaction === 'string' ?
                    transaction :
                    transaction.__payload__ ||
                    transaction.raw_data.contract[ 0 ].parameter.value
            )
        }).then(transaction => (
            callback(null, transaction)
        )).catch(err => {
            logger.warn('Failed to sign transaction:', err);
            callback(err);
        });
    }
};

pageHook.init();
