import MessageDuplex from '@mcashlight/lib/MessageDuplex';
import EventChannel from '@mcashlight/lib/EventChannel';
import Logger from '@mcashlight/lib/logger';
import extensionizer from 'extensionizer';

const logger = new Logger('contentScript');

const contentScript = {
    duplex: new MessageDuplex.Tab(),
    eventChannel: new EventChannel('contentScript'),

    init() {
        logger.info('Initialising McashLight');

        this.registerListeners();
        this.inject();
    },

    registerListeners() {
        this.eventChannel.on('tunnel', async data => {
            try {
                this.eventChannel.send(
                    'tabReply',
                    await this.duplex.send('tabRequest', data)
                );
            } catch(ex) {
                logger.info('Tab request failed:', ex);
            }
        });

        this.duplex.on('tunnel', ({ action, data }) => {
            this.eventChannel.send(action, data);
        });
    },

    inject() {
        const injectionSite = (document.head || document.documentElement);
        const container = document.createElement('script');

        container.src = extensionizer.extension.getURL('dist/pageHook.js');
        container.onload = function() {
            this.parentNode.removeChild(this);
        };

        injectionSite.insertBefore(
            container,
            injectionSite.children[ 0 ]
        );

        logger.info('McashLight injected');
    }
};

contentScript.init();
