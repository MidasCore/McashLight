import React from 'react';
// import Toast, { T } from 'react-toast-mobile';
import Toast from 'react-toast-mobile';
import Button from '@mcashlight/popup/src/components/Button';
import McashWeb from 'mcashweb';
import Dropdown from 'react-dropdown';
import { BigNumber } from 'bignumber.js';

import { PopupAPI } from '@mcashlight/lib/api';
import { connect } from 'react-redux';
import {
    FormattedMessage,
    FormattedHTMLMessage,
    injectIntl
} from 'react-intl';

import {
    CONFIRMATION_TYPE,
    BUTTON_TYPE
} from '@mcashlight/lib/constants';

import 'react-dropdown/style.css';
import './ConfirmationController.scss';
import { CHAIN_DECIMALS } from '../../config/constants';

const fromAmount = (amount, decimals = CHAIN_DECIMALS) => {
    return amount ? new BigNumber(amount).div(Math.pow(10, decimals)).toNumber() : 0;
};

class ConfirmationController extends React.Component {
    constructor({ intl }) {
        super();
        this.loadWhitelistOptions(intl);

        this.onReject = this.onReject.bind(this);
        this.onAccept = this.onAccept.bind(this);
        this.onWhitelist = this.onWhitelist.bind(this);
    }

    async componentDidMount() {}

    loadWhitelistOptions({ formatMessage }) {
        const options = [{
            value: false,
            label: formatMessage({ id: 'CONFIRMATIONS.OPTIONS.NO' })
        }, {
            value: 15 * 60 * 1000,
            label: formatMessage({ id: 'CONFIRMATIONS.OPTIONS.FIFTEEN_MINUTES' })
        }, {
            value: 30 * 60 * 1000,
            label: formatMessage({ id: 'CONFIRMATIONS.OPTIONS.THIRTY_MINUTES' })
        }, {
            value: 60 * 60 * 1000,
            label: formatMessage({ id: 'CONFIRMATIONS.OPTIONS.ONE_HOUR' })
        }, {
            value: 24 * 60 * 60 * 1000,
            label: formatMessage({ id: 'CONFIRMATIONS.OPTIONS.ONE_DAY' })
        }, {
            value: -1,
            label: formatMessage({ id: 'CONFIRMATIONS.OPTIONS.NEXT_LOGIN' })
        }];

        // eslint-disable-next-line
        this.state = {
            whitelisting: {
                selected: options[ 0 ],
                options
            },
            otherConfirmation: {}
        };
    }

    async addUsedDapp() {
        const { hostname } = this.props.confirmation;
        const dappList = await PopupAPI.getDappList(true);
        const { used } = dappList;
        const mcashDapps = await PopupAPI.getAllDapps();
        const regExp = new RegExp(hostname);
        if(used.length && used.some(({ href }) => href.match(regExp))) {
            const index = used.findIndex(({ href }) => href.match(regExp));
            const item = used.find(({ href }) => href.match(regExp));
            used.splice(index, 1);
            used.unshift(item);
        } else {
            const dapp = mcashDapps.filter(({ href }) => href.match(regExp));
            if(dapp.length)used.unshift( dapp[ 0 ] );
        }
        dappList.used = used;
        PopupAPI.setDappList(dappList);
    }

    onReject() {
        PopupAPI.rejectConfirmation();
    }

    async onAccept() {
        const {
            selected
        } = this.state.whitelisting;
        // const { confirmation } = this.props;
        // if( confirmation.contractType === 'TriggerSmartContract' ) {
        //     T.loading();
        //     await this.addUsedDapp();
        //     T.loaded();
        // }
        PopupAPI.acceptConfirmation(selected.value);
    }

    onWhitelist(selected) {
        this.setState({
            whitelisting: {
                ...this.state.whitelisting,
                selected
            }
        });
    }

    renderMessage() {
        const {
            formatMessage
        } = this.props.intl;

        const {
            hostname,
            input
        } = this.props.confirmation;

        return (
            <React.Fragment>
                <div className='modalDesc hasBottomMargin'>
                    <FormattedHTMLMessage
                        id='CONFIRMATIONS.BODY'
                        values={{
                            hostname: encodeURIComponent(hostname),
                            action: formatMessage({ id: 'CONTRACTS.SignMessage' })
                        }}
                    />
                </div>
                <div className='parameters mono'>
                    { input }
                </div>
            </React.Fragment>
        );
    }

    numberFormat = (num) => {
        const { formatNumber } = this.props.intl;
        return formatNumber(num, { maximumFractionDigits: CHAIN_DECIMALS });
    };

    handleConfirmation = async () => {
        try {
            const { input = {} } = this.props.confirmation;
            if (input.amount && typeof input.asset_id === 'number') {
                const tokenInfo = (input && input.tokenInfo) || {};
                const basicToken = await PopupAPI.getBasicToken(input.asset_id);
                if (basicToken) {
                    tokenInfo.precision = basicToken.precision || 0;
                    tokenInfo.symbol = basicToken.abbr || '';
                }
                this.setState({
                    otherConfirmation: { ...input, tokenInfo }
                });
            }
        } catch (e) {
            console.error('Error - Confirmation: ', e);
        }
    };

    renderTransaction() {
        const { options, selected } = this.state.whitelisting;

        const { formatMessage } = this.props.intl;

        const { hostname, contractType, input } = this.props.confirmation;

        const meta = [];
        const showWhitelist = contractType === 'TriggerSmartContract';

        let showParameters = false;

        if(input.call_value)
            meta.push({ key: 'CONFIRMATIONS.COST', value: this.numberFormat(fromAmount(input.call_value)) });

        if(input.amount && (contractType === 'TransferContract' || contractType === 'ParticipateAssetIssueContract'))
            meta.push({ key: 'CONFIRMATIONS.COST', value: this.numberFormat(fromAmount(input.amount)) });
        else if(input.amount) {
            const { tokenInfo } = this.state.otherConfirmation || {};
            if (!tokenInfo)
                this.handleConfirmation();
            const { precision = 0, symbol } = tokenInfo || {}
            const value = this.numberFormat(fromAmount(input.amount, precision)) + (symbol ? ` ${symbol}` : '');
            meta.push({ key: 'CONFIRMATIONS.COST', value });
        }

        if(input.frozen_balance)
            meta.push({ key: 'CONFIRMATIONS.COST', value: this.numberFormat(fromAmount(input.frozen_balance)) });

        if(input.stake_amount)
            meta.push({ key: 'CONFIRMATIONS.COST', value: this.numberFormat(fromAmount(input.stake_amount)) });

        if(input.asset_name)
            meta.push({ key: 'CONFIRMATIONS.TOKEN', value: McashWeb.toUtf8(input.asset_name) });

        if(input.token_id)
            meta.push({ key: 'CONFIRMATIONS.TOKEN', value: input.token_id });

        if(input.to_address) {
            const address = McashWeb.address.fromHex(input.to_address);
            const trimmed = [
                address.substr(0, 10),
                address.substr(28)
            ].join('...');

            meta.push({ key: 'CONFIRMATIONS.RECIPIENT', value: trimmed });
        }

        if(input.resource)
            meta.push({ key: 'CONFIRMATIONS.RESOURCE', value: formatMessage({ id: `CONFIRMATIONS.RESOURCE.${ input.resource }` }) });

        if(input.function_selector)
            meta.push({ key: 'CONFIRMATIONS.FUNCTION', value: input.function_selector });

        if(input.mcash_num)
            meta.push({ key: 'CONFIRMATIONS.TRX_RATIO', value: this.numberFormat(input.mcash_num) });

        if(input.num)
            meta.push({ key: 'CONFIRMATIONS.TOKEN_RATIO', value: this.numberFormat(input.num) });

        if(input.account_name)
            meta.push({ key: 'CONFIRMATIONS.ACCOUNT_NAME', value: input.account_name });

        if(input.proposal_id)
            meta.push({ key: 'CONFIRMATIONS.PROPOSAL_ID', value: input.proposal_id });

        if(input.quant)
            meta.push({ key: 'CONFIRMATIONS.QUANTITY', value: this.numberFormat(input.quant) });

        // This should be translated
        if('is_add_approval' in input)
            meta.push({ key: 'CONFIRMATIONS.APPROVE', value: input.is_add_approval });

        switch(contractType) {
            case 'ProposalCreateContract':
            case 'ExchangeCreateContract':
            case 'ExchangeInjectContract':
            case 'ExchangeWithdrawContract':
            case 'CreateSmartContract':
                showParameters = true;
                break;
            default:
                showParameters = false;
        }

        return (
            <React.Fragment>
                <div className='modalDesc'>
                    <FormattedHTMLMessage
                        id='CONFIRMATIONS.BODY'
                        values={{
                            hostname: encodeURIComponent(hostname),
                            action: formatMessage({ id: `CONTRACTS.${ contractType }` })
                        }}
                    />
                </div>
                { meta.length ? (
                    <div className='meta'>
                        { meta.map(({ key, value }) => (
                            <div className='metaLine' key={ key }>
                                <FormattedMessage id={ key } />
                                <span className='value'>
                                    { value }
                                </span>
                            </div>
                        )) }
                    </div>
                ) : '' }
                { showParameters ? (
                    <div className='parameters mono'>
                        { JSON.stringify(input, null, 2 ) }
                    </div>
                ) : '' }
                { showWhitelist ? (
                    <div className='whitelist'>
                        <FormattedMessage
                            id='CONFIRMATIONS.WHITELIST.TITLE'
                            children={ text => (
                                <div className='whitelistTitle'>
                                    { text }
                                </div>
                            ) }
                        />
                        <FormattedMessage
                            id='CONFIRMATIONS.WHITELIST.BODY'
                            children={ text => (
                                <div className='whitelistBody'>
                                    { text }
                                </div>
                            ) }
                        />
                        <Dropdown
                            className='dropdown'
                            options={ options }
                            value={ selected }
                            onChange={ this.onWhitelist }
                        />
                    </div>
                ) : '' }
            </React.Fragment>
        );
    }

    render() {
        const {
            type
        } = this.props.confirmation || {};
        return (
            <div className='insetContainer confirmationController'>
                <div className='greyModal confirmModal'>
                    <Toast />
                    <FormattedMessage id='CONFIRMATIONS.HEADER' children={ text => (
                        <div className='pageHeader hasBottomMargin'>
                            { text }
                        </div>
                    ) }
                    />
                    {type === CONFIRMATION_TYPE.STRING ?
                        this.renderMessage() :
                        (type === CONFIRMATION_TYPE.TRANSACTION ?
                            this.renderTransaction() : null
                        )
                    }
                    <div className='buttonRow'>
                        <Button
                            id='BUTTON.REJECT'
                            type={ BUTTON_TYPE.DANGER }
                            onClick={ this.onReject }
                            tabIndex={ 3 }
                        />
                        <Button
                            id='BUTTON.ACCEPT'
                            onClick={ this.onAccept }
                            tabIndex={ 2 }
                        />
                    </div>
                </div>
            </div>
        );
    }
}

export default injectIntl(
    connect(state => ({
        confirmation: state.confirmations[ 0 ]
    }))(ConfirmationController)
);
