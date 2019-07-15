import React from 'react';
import { connect } from 'react-redux';
import { FormattedMessage, injectIntl } from 'react-intl';
import { BigNumber } from 'bignumber.js';
import { PopupAPI } from '@mcashlight/lib/api';
import Button from '@mcashlight/popup/src/components/Button';
import { APP_STATE } from '@mcashlight/lib/constants';
import swal from 'sweetalert2';
// import Logger from '@mcashlight/lib/logger';
import { ACTIVE_ACCOUNT_FEE, CHAIN_DECIMALS, CHAIN_SYMBOL } from '../config/constants';

// const logger = new Logger('ActiveAccountController');

class ActiveAccountController extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isOpen: {
                account: false,
                token: false
            },
            loading: false,
            receiverAddress: '',
            amount: {
                valid: false,
                value: ACTIVE_ACCOUNT_FEE,
                error: ''
            },
            paymentAccounts: {}
        };
    }

    componentDidMount() {
        const { selected, accounts } = this.props.accounts;
        const receiverAddress = selected ? selected.address : '';
        const filterAccounts = Object.keys(accounts).filter((address) => address !== receiverAddress);
        const paymentAccounts = {};
        if (filterAccounts.length > 0) {
            filterAccounts.forEach(v => {
                paymentAccounts[ v ] = { ...accounts[ v ] };
            });
        }
        this.setState({
            receiverAddress,
            paymentAccounts
        }, () => {
            const paymentAddress = Object.keys(paymentAccounts)[ 0 ];
            if (paymentAddress)
                PopupAPI.selectAccount(paymentAddress);
        });
    }

    changeAccount (address, e) {
        e.stopPropagation();
        const { isOpen } = this.state;
        isOpen.account = !isOpen.account;
        const { selected } = this.props.accounts;
        this.setState({ isOpen }, () => {
            this.validateAmount(address);
        });
        if (selected.address !== address)
            PopupAPI.selectAccount(address);
    }

    validateAmount(address) {
        const { selected, accounts } = this.props.accounts;
        const currentSelected = address && accounts && accounts[ address ] ? accounts[ address ] : selected;
        let { value } = this.state.amount;
        value = new BigNumber(value || 0);
        if(value.gt(new BigNumber(currentSelected.balance).shiftedBy(-CHAIN_DECIMALS))) {
            return this.setState({
                amount: {
                    valid: false,
                    value: value.toString(),
                    error: 'EXCEPTION.SEND.AMOUNT_NOT_ENOUGH_ERROR'
                }
            });
        }
        if(currentSelected.netLimit - currentSelected.netUsed < 250) {
            return this.setState({
                amount: {
                    valid: new BigNumber(currentSelected.balance).shiftedBy(-CHAIN_DECIMALS).gte(new BigNumber(1)),
                    value: value.toString(),
                    error: 'EXCEPTION.SEND.BANDWIDTH_NOT_ENOUGH_ERROR'
                }
            });
        }
        return this.setState({
            amount: {
                valid: true,
                value: value.toString(),
                error: ''
            }
        });
    }

    onSend = () => {
        this.setState({
            loading: true,
            success: false
        });
        const { formatMessage } = this.props.intl;
        const { receiverAddress } = this.state;

        const func = PopupAPI.createAccount(receiverAddress);

        func.then(() => {
            swal(formatMessage({ id: 'ACCOUNT.ACTIVE.SUCCESS' }), '', 'success')
                .then(() => {
                    this.setState({
                        loading: false
                    }, () => {
                        this.onCancel();
                    });
                });
        }).catch(error => {
            swal(JSON.stringify(error), '', 'error');
            this.setState({
                loading: false
            });
        });
    };

    onCancel = () => {
        const { receiverAddress } = this.state;
        if (receiverAddress)
            PopupAPI.selectAccount(receiverAddress);

        PopupAPI.changeState(APP_STATE.READY);
    };

    render() {
        const { isOpen, loading, receiverAddress, amount, paymentAccounts } = this.state;
        const { selected } = this.props.accounts;

        return (
            <div className='insetContainer send' onClick={() => { this.setState({ isOpen: { account: false, token: false } }); }}>
                <div className='pageHeader'>
                    <div className='back' onClick={this.onCancel} />
                    <FormattedMessage id='ACCOUNT.ACTIVE.TITLE'/>
                </div>
                <div className='greyModal'>
                    <div className='input-group'>
                        <label><FormattedMessage id='ACCOUNT.SEND.PAY_ACCOUNT'/></label>
                        <div
                            className={ `input dropDown${isOpen.account ? ' isOpen' : ''}`}
                            onClick={(e) => { e.stopPropagation();isOpen.token = false;isOpen.account = !isOpen.account; this.setState({ isOpen }); } }
                        >
                            <div className='selected'>{ selected.address }</div>
                            <div
                                className='dropWrap'
                                style={isOpen.account ? (Object.entries(paymentAccounts).length <= 5 ? { height: 48 * Object.entries(paymentAccounts).length } : { height: 180, overflow: 'scroll' }) : {}}
                            >
                                {
                                    Object.entries(paymentAccounts).map(([address]) => (
                                        <div
                                            key={address}
                                            className={`dropItem multiple-line${address === selected.address ? ' selected' : ''}`}
                                            onClick={(e) => {
                                                this.changeAccount(address, e);
                                            }}
                                        >
                                            <div className={'name'}>
                                                <small>{paymentAccounts[ address ] ? paymentAccounts[ address ].name : 'Wallet'}:</small>
                                            </div>
                                            {address}
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                        <div className='otherInfo'>
                            <FormattedMessage id='COMMON.BALANCE'/>:&nbsp;
                            {selected.balance / Math.pow(10, CHAIN_DECIMALS)} {CHAIN_SYMBOL}
                        </div>
                    </div>
                    <div className={'input-group'}>
                        <label><FormattedMessage id='ACCOUNT.SEND.RECEIVE_ADDRESS'/></label>
                        <div className='input'>
                            <span>{receiverAddress}</span>
                        </div>
                    </div>
                    <div className={`input-group hasBottomMargin ${amount.error ? ' error' : ''}`}>
                        <label><FormattedMessage id='ACCOUNT.ACTIVE.FEE'/></label>
                        <div className='input'>
                            <span>{ `${ amount.value } ${CHAIN_SYMBOL}` }</span>
                        </div>
                        <div className='tipError'>
                            {amount.error ? <FormattedMessage id={amount.error} /> : null}
                        </div>
                    </div>
                    <Button
                        id='ACCOUNT.ACTIVE.BUTTON'
                        isLoading={ loading }
                        isValid={ true }
                        renderIcon={() => <span className={'c-icon icon-send'} />}
                        onClick={this.onSend}
                    />
                </div>
            </div>
        );
    }
}

export default injectIntl(
    connect(state => ({
        accounts: state.accounts
    }))(ActiveAccountController)
);
