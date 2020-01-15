import React from 'react';
import { IntlProvider, FormattedMessage } from 'react-intl';
import { connect } from 'react-redux';
import { PopupAPI } from '@mcashlight/lib/api';

import { APP_STATE } from '@mcashlight/lib/constants';

import RegistrationController from '@mcashlight/popup/src/controllers/RegistrationController';
import LoginController from '@mcashlight/popup/src/controllers/LoginController';
import WalletCreationController from '@mcashlight/popup/src/controllers/WalletCreationController';
import CreateAccountController from '@mcashlight/popup/src/controllers/CreateAccountController';
import RestoreAccountController from '@mcashlight/popup/src/controllers/RestoreAccountController';
import PageController from '@mcashlight/popup/src/controllers/PageController';
import ConfirmationController from '@mcashlight/popup/src/controllers/ConfirmationController';
import ReceiveController from '@mcashlight/popup/src/controllers/ReceiveController';
import SendController from '@mcashlight/popup/src/controllers/SendController';
import TransactionsController from '@mcashlight/popup/src/controllers/TransactionsController';
import SettingController from '@mcashlight/popup/src/controllers/SettingController';
import AddTokenController from '@mcashlight/popup/src/controllers/AddTokenController';
import ActiveAccountController from '@mcashlight/popup/src/controllers/ActiveAccountController';

import 'antd-mobile/dist/antd-mobile.css';
import 'react-custom-scroll/dist/customScroll.css';
import 'assets/styles/global.scss';
import 'react-toast-mobile/lib/react-toast-mobile.css';

import enMessages from '@mcashlight/popup/src/translations/en.json';
import zhMessages from '@mcashlight/popup/src/translations/zh.json';
import jaMessages from '@mcashlight/popup/src/translations/ja.json';
class App extends React.Component {
    messages = {
        en: enMessages,
        zh: zhMessages,
        ja: jaMessages
    };

    render() {
        const { appState, accounts, prices, nodes, language, lock, version } = this.props;
        let dom = null;
        switch(appState) {
            case APP_STATE.UNINITIALISED:
                dom = <RegistrationController language={language} />;
                break;
            case APP_STATE.PASSWORD_SET:
                dom = <LoginController />;
                break;
            case APP_STATE.UNLOCKED:
                dom = <WalletCreationController />;
                break;
            case APP_STATE.CREATING:
                dom = <CreateAccountController />;
                break;
            case APP_STATE.RESTORING:
                dom = <RestoreAccountController />;
                break;
            case APP_STATE.READY:
                dom = <PageController />;
                break;
            case APP_STATE.REQUESTING_CONFIRMATION:
                dom = <ConfirmationController />;
                break;
            case APP_STATE.RECEIVE:
                dom = <ReceiveController accounts={accounts} address={accounts.selected.address} />;
                break;
            case APP_STATE.SEND:
                dom = <SendController accounts={accounts} />;
                break;
            case APP_STATE.TRANSACTIONS:
                dom = <TransactionsController prices={prices} accounts={accounts} nodes={nodes} onCancel={ () => PopupAPI.changeState(APP_STATE.READY) } />;
                break;
            case APP_STATE.SETTING:
                dom = <SettingController lock={lock} version={version} language={language} prices={prices} nodes={nodes} onCancel={ () => PopupAPI.changeState(APP_STATE.READY) } />;
                break;
            case APP_STATE.ADD_M20_TOKEN:
                dom = <AddTokenController tokens={accounts.selected.tokens} onCancel={ () => PopupAPI.changeState(APP_STATE.READY) } />;
                break;
            case APP_STATE.ACTIVE_ACCOUNT:
                dom = <ActiveAccountController />;
                break;
            default:
                dom =
                    <div className='unsupportedState' onClick={ () => PopupAPI.resetState(APP_STATE.READY) }>
                        <FormattedMessage id='ERRORS.UNSUPPORTED_STATE' values={{ appState }} />
                    </div>;
        }

        return (
            <IntlProvider locale={ language } messages={ this.messages[ language ] }>
                { dom }
            </IntlProvider>
        );
    }
}

export default connect(state => ({
    language: state.app.language,
    appState: state.app.appState,
    accounts: state.accounts,
    nodes: state.app.nodes,
    prices: state.app.prices,
    lock: state.app.setting.lock,
    version: state.app.version
}))(App);
