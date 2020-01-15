import React from 'react';
// import CopyToClipboard from 'react-copy-to-clipboard';
import swal from 'sweetalert2';
import { Toast, Modal } from 'antd-mobile';
import { BigNumber } from 'bignumber.js';
import { PopupAPI } from '@mcashlight/lib/api';
import Utils from '@mcashlight/lib/utils';
import Header from '@mcashlight/popup/src/controllers/PageController/Header';
import Button from '@mcashlight/popup/src/components/Button';
import CopyTextToClipboard from '@mcashlight/popup/src/components/CopyTextToClipboard';
import { connect } from 'react-redux';
import { APP_STATE, BUTTON_TYPE } from '@mcashlight/lib/constants';
import { FormattedMessage, injectIntl } from 'react-intl';
import './AccountsPage.scss';
import '@mcashlight/popup/src/controllers/PageController/Header/Header.scss';
import { ACTIVE_ACCOUNT_FEE, CHAIN_DECIMALS } from '../../config/constants';
import Backup from './Backup';
import Resource from './Resource';
// import Ieos from './Ieos';
import Tokens from './Tokens';

const antdAlert = Modal.alert;
const mcashImg = require('@mcashlight/popup/src/assets/images/new/mcash.png');
let mcashscanUrl = '';

class AccountsPage extends React.Component {
    constructor() {
        super();
        this.onClick = this.onClick.bind(this);
        this.onDelete = this.onDelete.bind(this);
        this.onExport = this.onExport.bind(this);
        this.state = {
            mnemonic: false,
            privateKey: false,
            showMenuList: false,
            showNodeList: false,
            showBackUp: false,
            showDelete: false,
            news: []
        };
    }

    async componentDidMount() {
        PopupAPI.refresh();
        //
        const { prices, accounts } = this.props;
        const t = { name: 'MCASH', id: 0, amount: 0, decimals: 8, price: prices.priceList[ prices.selected ], imgUrl: mcashImg };
        PopupAPI.setSelectedToken(t);
        //
        if (accounts.selected && !accounts.selected.hasDisplayedActivationPrompt)
            this.checkActiveAccount();

        //
        //const { developmentMode } = this.props.setting;
        mcashscanUrl = 'https://mcashscan.io/#';
        const news = await PopupAPI.getNews();
        if(news.length > 0)
            this.setState({ news });

        await PopupAPI.setAirdropInfo(accounts.selected.address);
        const dappList = await PopupAPI.getDappList(false);
        PopupAPI.setDappList(dappList);
    }

    checkActiveAccount = () => {
        const { selected, accounts } = this.props.accounts || {};
        const activeFee = new BigNumber(ACTIVE_ACCOUNT_FEE).multipliedBy(Math.pow(10, CHAIN_DECIMALS));
        const hasBalance = accounts ? Object.keys(accounts).find(address => new BigNumber(accounts[ address ].balance || 0).gte(activeFee)) : null;
        const hasActivationPrompt = selected && selected.address && !selected.activated && accounts && Object.keys(accounts).length > 1 && !!hasBalance;
        if (hasActivationPrompt) {
            PopupAPI.getAccountInfo(selected.address)
                .then(result => {
                    if (!result.address)
                        this.showAlertActiveAccount();
                });
        }
    };

    showAlertActiveAccount = () => {
        const { formatMessage } = this.props.intl;
        antdAlert(formatMessage({ id: 'ACCOUNT.ACTIVE.TITLE' }), formatMessage({ id: 'EXCEPTION.SEND.ADDRESS_UNACTIVATED_ERROR' }), [
            { text: formatMessage({ id: 'ACCOUNT.ACTIVE.CANCEL' }), onPress: () => this.closeAlertActiveAccount() },
            { text: formatMessage({ id: 'ACCOUNT.ACTIVE.OK' }), onPress: () => this.redirectToActiveAccount() }
        ]);
    };

    closeAlertActiveAccount = () => {
        PopupAPI.closeActivationPrompt();
    };

    redirectToActiveAccount = () => {
        this.closeAlertActiveAccount();
        PopupAPI.changeState(APP_STATE.ACTIVE_ACCOUNT);
    };

    onClick(address) {
        const { selected } = this.props.accounts;

        if(selected.address === address)
            return;

        PopupAPI.selectAccount(address);
    }

    async onDelete() {
        const { formatMessage } = this.props.intl;
        if(Object.keys(this.props.accounts.accounts).length === 1)
            swal(formatMessage({ id: 'At least one account is required' }), '', 'warning');
        else {
            this.setState({
                showDelete: true
            });
        }
    }

    async onExport() {
        const {
            mnemonic,
            privateKey
        } = await PopupAPI.exportAccount();
        this.setState({
            mnemonic,
            privateKey,
            showBackUp: true
        });
    }

    handleShowNodeList() {
        this.setState({
            showMenuList: false,
            showNodeList: !this.state.showNodeList
        });
    }

    openAccountsMenu = async () => {
        const setting = await PopupAPI.getSetting();
        if (this.props.setting && !this.props.setting.openAccountsMenu) {
            const openAccountsMenu = true;
            PopupAPI.setSetting({ ...setting, openAccountsMenu });
        }
    };

    renderAccountInfo(accounts, prices, totalMoney, mcashPrice) {
        const { formatMessage } = this.props.intl;
        const { showMenuList } = this.state;
        return (
            <div className='accountInfo'>
                <div className='row1'>
                    <div className='accountWrap' onClick={this.openAccountsMenu}>
                        <span>{accounts.selected.name.length > 30 ? `${accounts.selected.name.substr(0, 30)}...` : accounts.selected.name}</span>
                    </div>
                    <div className='menu' onClick={(e) => { e.stopPropagation();this.setState({ showMenuList: !showMenuList, showNodeList: false }); }}>
                        <div className='dropList menuList' style={ showMenuList ? { width: '160px', height: 30 * 7, opacity: 1 } : {}}>
                            <div onClick={(e) => { e.stopPropagation();window.open(`${mcashscanUrl}/account?from=mcashlight&type=frozen`); }} className='item'>
                                <span className='icon frozen'></span>
                                <FormattedMessage id='MENU.FROZEN_UNFROZEN' />
                            </div>
                            <div onClick={(e) => { e.stopPropagation();window.open(`${mcashscanUrl}/account?from=mcashlight&type=stake`); }} className='item'>
                                <span className='icon stake'></span>
                                <FormattedMessage id='MENU.STAKE_UNSTAKE' />
                            </div>
                            <div onClick={(e) => { e.stopPropagation();window.open(`${mcashscanUrl}/supernode/votes?from=mcashlight`); }} className='item'>
                                <span className='icon vote'></span>
                                <FormattedMessage id='MENU.VOTE' />
                            </div>
                            <div onClick={ () => { PopupAPI.changeState(APP_STATE.ADD_M20_TOKEN); }} className='item'>
                                <span className='icon addToken'></span>
                                <FormattedMessage id='MENU.ADD_TRC20_TOKEN' />
                            </div>
                            <div onClick={ this.onExport } className='item'>
                                <span className='icon backup'></span>
                                <FormattedMessage id='ACCOUNTS.EXPORT' />
                            </div>
                            <div onClick={(e) => { e.stopPropagation();window.open(`${mcashscanUrl}/account?from=mcashlight`); }} className='item'>
                                <span className='icon link'></span>
                                <FormattedMessage id='MENU.ACCOUNT_DETAIL' />
                            </div>
                            <div className='item' onClick={ () => { this.onDelete(); } }>
                                <span className='icon delete'></span>
                                <FormattedMessage id='MENU.DELETE_WALLET' />
                            </div>
                        </div>
                    </div>
                </div>
                <div className='row2'>
                    {
                        !accounts.selected.activated && (
                            <span className='account-deactivate' onClick={this.checkActiveAccount} />
                        )
                    }
                    <span>{`${accounts.selected.address.substr(0, 10)}...${accounts.selected.address.substr(-10)}`}</span>
                    <input value={accounts.selected.address} type='hidden'/>
                    <CopyTextToClipboard
                        text={accounts.selected.address}
                        onCopy={text => {
                            console.log('Copy to clipboard: ', text);
                            Toast.info(formatMessage({ id: 'TOAST.COPY' }), 2, () => {}, false);
                        }}
                    >
                        <span className='copy' />
                    </CopyTextToClipboard>
                </div>
                <div className='row3'>
                    ≈ {mcashPrice ? Utils.formattedPrice(totalMoney) : '--'} {prices.selected}
                </div>
                <div className='row4'>
                    <div onClick={ () => PopupAPI.changeState(APP_STATE.RECEIVE) }>
                        <span></span>
                        <FormattedMessage id='ACCOUNT.RECEIVE' />
                    </div>
                    <div onClick={ () => PopupAPI.changeState(APP_STATE.SEND) }>
                        <span></span>
                        <FormattedMessage id='ACCOUNT.SEND' />
                    </div>
                </div>
            </div>
        );
    }

    renderDeleteAccount() {
        const { showDelete } = this.state;
        if (!showDelete) return null;
        const { formatMessage } = this.props.intl;
        return (
            <div className='popUp'>
                <div className='deleteAccount'>
                    <div className='title'>
                        <FormattedMessage id='ACCOUNTS.CONFIRM_DELETE' />
                    </div>
                    <div className='img'></div>
                    <div className='txt'>
                        <FormattedMessage id='ACCOUNTS.CONFIRM_DELETE.BODY' />
                    </div>
                    <div className='buttonRow'>
                        <Button
                            id='BUTTON.CANCEL'
                            type={ BUTTON_TYPE.DANGER }
                            onClick={ () => { this.setState({ showDelete: false }); } }
                            tabIndex={ 1 }
                        />
                        <Button
                            id='BUTTON.CONFIRM'
                            onClick={() => {
                                PopupAPI.deleteAccount();
                                swal(formatMessage({ id: 'ACCOUNTS.DELETE.SUCCESS' }), '', 'success');
                                this.setState({ showDelete: false });
                            }}
                            tabIndex={ 1 }
                        />
                    </div>
                </div>
            </div>
        );
    }

    renderBackup(mnemonic, privateKey) {
        const { showBackUp } = this.state;
        return showBackUp ? (
            <Backup
                mnemonic={mnemonic}
                privateKey={privateKey}
                onClose={() => { this.setState({ showBackUp: false }); }}
            />
        ) : null;
    }

    render() {
        BigNumber.config({ EXPONENTIAL_AT: [-20, 30] });
        let totalAsset = new BigNumber(0);
        let totalMcash = new BigNumber(0);
        // const { showNodeList, mnemonic, privateKey, news, ieos } = this.state;
        const { showNodeList, mnemonic, privateKey } = this.state;
        // const id = news.length > 0 ? news[ 0 ].id : 0;
        const { accounts, prices, nodes, setting } = this.props;
        // const { selected: { airdropInfo } } = accounts;
        //const mode = setting.developmentMode?'developmentMode':'productionMode';
        // const mode = 'productionMode';
        const { formatMessage } = this.props.intl;
        const mcash_price = prices.priceList[ prices.selected ];
        const mcash = {
            tokenId: 0,
            name: 'MCASH',
            balance: (accounts.selected.balance + (accounts.selected.frozenBalance ? accounts.selected.frozenBalance : 0) + (accounts.selected.stakeBalance ? accounts.selected.stakeBalance : 0)),
            abbr: 'MCASH',
            decimals: 8,
            imgUrl: mcashImg,
            price: mcash_price
        };
        let tokens = { ...accounts.selected.tokens.basic, ...accounts.selected.tokens.smart };
        tokens = Utils.dataLetterSort(Object.entries(tokens)
            .filter(([tokenId, token]) => typeof token === 'object')
            .map(v => { v[ 1 ].tokenId = v[ 0 ]; return v[ 1 ]; })
            .filter(v => v.balance > 0 || (v.balance == 0 && v.symbol) ), 'abbr', 'symbol');
        tokens = [mcash, ...tokens];
        tokens = tokens.map(({ tokenId, ...token }) => {
            token.decimals = token.decimals || 0;
            return { tokenId, ...token };
        });
        Object.entries(accounts.accounts).forEach(([address, account]) => {
            totalAsset = totalAsset.plus(new BigNumber(account.asset));
            totalMcash = totalMcash.plus(new BigNumber(account.balance).shiftedBy(-8));
        });
        // const asset = accounts.accounts[ accounts.selected.address ] && accounts.accounts[ accounts.selected.address ].asset ? accounts.accounts[ accounts.selected.address ].asset : 0;
        // const totalMoney = Utils.formattedPrice(new BigNumber(asset).multipliedBy(mcash_price).toString());
        const totalMoney = tokens.reduce((total, token) => {
            const amount = new BigNumber(token.balance).shiftedBy(-token.decimals);
            const price = Utils.getTokenPrice(token, prices.selected);
            const money = amount.multipliedBy(price);
            return new BigNumber(total).plus(money).toString();
        }, 0);

        return (
            <div className='accountsPage' onClick={() => {
                this.setState({
                    showMenuList: false
                });
            }}
            >
                {
                    this.renderBackup(mnemonic, privateKey)
                }
                {
                    this.renderDeleteAccount()
                }
                <Header
                    showNodeList={showNodeList}
                    developmentMode={setting.developmentMode}
                    nodes={nodes}
                    handleShowNodeList={this.handleShowNodeList.bind(this)}
                    openAccountsMenu={this.openAccountsMenu}
                />
                <div className='space-controller'>
                    <div className={`accountsWrap${setting.openAccountsMenu ? ' show' : ''}`}>
                        <div className='accounts'>
                            <div className='row1'>
                                <div className='cell' onClick={ () => PopupAPI.changeState(APP_STATE.CREATING) }>
                                    <FormattedMessage id='CREATION.CREATE.TITLE' />
                                </div>
                                <div className='cell' onClick={ () => PopupAPI.changeState(APP_STATE.RESTORING) }>
                                    <FormattedMessage id='CREATION.RESTORE.TITLE' />
                                </div>
                            </div>
                            <div className='row2'>
                                <div className='cell'>
                                    <span>MCASH:</span>
                                    <span>{new BigNumber(totalMcash.toFixed(2)).toFormat()}</span>
                                </div>
                                <div className='cell'>
                                    <FormattedMessage id='MENU.ACCOUNTS.TOTAL_ASSET' values={{ sign: ':' }} />
                                    <span>{mcash_price ? Utils.formattedPrice(totalAsset.multipliedBy(mcash_price).toString()) : '--'}{ ' ' }{ prices.selected }</span>
                                </div>
                            </div>
                            <div className='row3'>
                                {
                                    Object.entries(accounts.accounts).map(([address, account], i) => {
                                        return (
                                            <div key={`cell-${i}`} className={`cell cell${ (i % 5) + 1 }${accounts.selected.address === address ? ' selected' : ''}`} onClick={async() => {
                                                const setting = await PopupAPI.getSetting();
                                                const openAccountsMenu = false;
                                                PopupAPI.setSetting({ ...setting, openAccountsMenu });
                                                if(accounts.selected.address === address)
                                                    return;
                                                PopupAPI.selectAccount(address);
                                            }}
                                            >
                                                <div className='top'>
                                                    <div className='name'>
                                                        {account.name.length > 30 ? `${account.name.substr(0, 30) }...` : account.name}
                                                    </div>
                                                    <div className='asset'>
                                                        <span>MCASH: { new BigNumber(new BigNumber(account.balance).shiftedBy(-8).toFixed(2)).toFormat() }</span>
                                                        <span><FormattedMessage id='MENU.ACCOUNTS.TOTAL_ASSET' values={{ sign: ':' }} />{' '}{mcash_price ? Utils.formattedPrice(new BigNumber(account.asset).multipliedBy(mcash_price).toString()) : '--'}{' '}{ prices.selected }</span>
                                                    </div>
                                                </div>
                                                <div className='bottom'>
                                                    <span>{ `${address.substr(0, 10)}...${address.substr(-10)}` }</span>
                                                    <div onClick={ (e) => { e.stopPropagation(); }}>
                                                        <input value={address} type='hidden'/>
                                                        <CopyTextToClipboard
                                                            text={address}
                                                            onCopy={text => {
                                                                console.log('Copy to clipboard: ', text);
                                                                Toast.info(formatMessage({ id: 'TOAST.COPY' }), 2, () => {}, false);
                                                            }}
                                                        >
                                                            <span className='copy'/>
                                                        </CopyTextToClipboard>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        </div>
                        <div className='closed' onClick={async() => {
                            const setting = await PopupAPI.getSetting();
                            const openAccountsMenu = false;
                            PopupAPI.setSetting({ ...setting, openAccountsMenu });
                        }}
                        >
                        </div>
                    </div>
                    { accounts.selected.address ? this.renderAccountInfo(accounts, prices, totalMoney, mcash_price) : null }
                    <div className='listWrap'>
                        <Resource account={accounts.accounts[ accounts.selected.address ]} />
                        <div className='scroll'>
                            <Tokens tokens={tokens} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default injectIntl(
    connect(state => ({
        language: state.app.language,
        accounts: state.accounts,
        prices: state.app.prices,
        nodes: state.app.nodes,
        setting: state.app.setting
    }))(AccountsPage)
);
