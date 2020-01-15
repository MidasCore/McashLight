import React from 'react';
import { connect } from 'react-redux';
import { FormattedMessage, injectIntl } from 'react-intl';
import { BigNumber } from 'bignumber.js';
import { PopupAPI } from '@mcashlight/lib/api';
import _ from 'lodash';
import Button from '@mcashlight/popup/src/components/Button';
import { VALIDATION_STATE, APP_STATE, BUTTON_TYPE } from '@mcashlight/lib/constants';
import { resetInputDefault } from '@mcashlight/popup/src/reducers/sendingReducer';
import McashWeb from 'mcashweb';
import swal from 'sweetalert2';
import Utils from '@mcashlight/lib/utils';
// import Logger from '@mcashlight/lib/logger';
import { CHAIN_DECIMALS, CHAIN_SYMBOL, MCASHSCAN_URL } from '../config/constants';

const mcashImg = require('@mcashlight/popup/src/assets/images/new/mcash.png');
// const logger = new Logger('SendController');

class SendController extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isOpen: {
                account: false,
                token: false
            },
            selectedToken: {
                id: 0,
                name: 'MCASH',
                amount: 0,
                decimals: 8
            },
            recipient: {
                error: '',
                value: '',
                valid: false,
                isActivated: true
            },
            amount: {
                error: '',
                value: 0,
                valid: false,
                values: ''
            },
            loading: false,
            showConfirm: false,
            memo: {
                error: '',
                value: '',
                valid: true
            }
        };
    }

    componentDidMount() {
        const { selectedToken, selected } = this.props.accounts;
        selectedToken.amount = selectedToken.id === 0 ? selected.balance / Math.pow(10, 8) : selectedToken.amount;
        this.setState({ selectedToken });
        if (this.props.inputDefault) {
            const { recipient, amount } = this.props.inputDefault;
            if (recipient && typeof recipient === 'string')
                this.onRecipientChange(recipient);
            if (amount && !isNaN(amount))
                this.onAmountChange(amount);
            this.props.resetInputDefault();
        }
    }

    // componentWillReceiveProps(nextProps) {
    //     const { selected } = nextProps.accounts;
    //     const { selectedToken } = this.state;
    //     if(selectedToken.id === 0)
    //         selectedToken.amount = selected.balance / Math.pow(10, CHAIN_DECIMALS);
    //     else if (selected.tokens) {
    //         if (!isNaN(selectedToken.id)) {
    //             const basicToken = selected.tokens.basic ? selected.tokens.basic[ selectedToken.id ] : null;
    //             selectedToken.amount = basicToken ? basicToken.balance / Math.pow(10, basicToken.decimals) : 0;
    //         } else if (typeof selectedToken.id === 'string' && selectedToken.id.match(/^M/)) {
    //             const smartToken = selected.tokens.smart ? selected.tokens.smart[ selectedToken.id ] : null;
    //             selectedToken.amount = smartToken ? smartToken.balance / Math.pow(10, smartToken.decimals) : 0;
    //         }
    //     }
    //     this.setState({ selectedToken });
    // }

    // static getDerivedStateFromProps(nextProps, prevState) {
    //     const { selected } = nextProps.accounts;
    //     const { selectedToken } = prevState;
    //     if (selectedToken.id === 0)
    //         selectedToken.amount = selected.balance / Math.pow(10, CHAIN_DECIMALS);
    //     else if (selected.tokens) {
    //         if (!isNaN(selectedToken.id)) {
    //             const basicToken = selected.tokens.basic ? selected.tokens.basic[ selectedToken.id ] : null;
    //             selectedToken.amount = basicToken ? basicToken.balance / Math.pow(10, basicToken.decimals) : 0;
    //         } else if (typeof selectedToken.id === 'string' && selectedToken.id.match(/^M/)) {
    //             const smartToken = selected.tokens.smart ? selected.tokens.smart[ selectedToken.id ] : null;
    //             selectedToken.amount = smartToken ? smartToken.balance / Math.pow(10, smartToken.decimals) : 0;
    //         }
    //     }
    //     return { selectedToken };
    // }

    componentDidUpdate(prevProps) {
        const { selected } = prevProps.accounts;
        if (selected !== this.props.accounts.selected) {
            const { selectedToken } = this.state;
            if (selectedToken.id === 0)
                selectedToken.amount = selected.balance / Math.pow(10, CHAIN_DECIMALS);
            else if (selected.tokens) {
                if (!isNaN(selectedToken.id)) {
                    const basicToken = selected.tokens.basic ? selected.tokens.basic[ selectedToken.id ] : null;
                    selectedToken.amount = basicToken ? basicToken.balance / Math.pow(10, basicToken.decimals) : 0;
                } else if (typeof selectedToken.id === 'string' && selectedToken.id.match(/^M/)) {
                    const smartToken = selected.tokens.smart ? selected.tokens.smart[ selectedToken.id ] : null;
                    selectedToken.amount = smartToken ? smartToken.balance / Math.pow(10, smartToken.decimals) : 0;
                }
            }
            this.setState({ selectedToken });
        }
    }

    changeToken(selectedToken, e) {
        e.stopPropagation();
        const { isOpen } = this.state;
        isOpen.token = !isOpen.token;
        this.setState({ isOpen, selectedToken }, () => {
            this.validateAmount();
            if (!this.supportedMemo()) {
                this.setState({
                    memo: {
                        error: '',
                        value: '',
                        valid: true
                    }
                });
            }
        });
        PopupAPI.setSelectedToken(selectedToken);
    }

    changeAccount(address, e) {
        e.stopPropagation();
        const { isOpen } = this.state;
        isOpen.account = !isOpen.account;
        const { selected, accounts } = this.props.accounts;
        const selectedToken = {
            id: 0,
            name: 'MCASH',
            decimals: CHAIN_DECIMALS,
            amount: new BigNumber(accounts[ address ] ? accounts[ address ].balance : 0).shiftedBy(-CHAIN_DECIMALS).toString()
        };
        this.setState({ isOpen, selectedToken }, () => { this.validateAmount(); });
        if(selected.address === address)
            return;
        PopupAPI.selectAccount(address);
    }

    onRecipientChange = async (address) => {
        const { selected } = this.props.accounts;

        const recipient = {
            value: address,
            valid: VALIDATION_STATE.NONE
        };

        if(!address.length)
            return this.setState({ recipient });

        if(!McashWeb.isAddress(address)) {
            recipient.valid = false;
            recipient.error = 'EXCEPTION.SEND.ADDRESS_FORMAT_ERROR';
        } else {
            const account = await PopupAPI.getAccountInfo(address);
            if(!account.address) {
                recipient.isActivated = false;
                recipient.valid = true;
                recipient.error = 'EXCEPTION.SEND.ADDRESS_UNACTIVATED_ERROR';
            } else if(address === selected.address) {
                recipient.isActivated = true;
                recipient.valid = false;
                recipient.error = 'EXCEPTION.SEND.ADDRESS_SAME_ERROR';
            } else {
                recipient.isActivated = true;
                recipient.valid = true;
                recipient.error = '';
            }
        }
        this.setState({ recipient });
    };

    onAmountChange = (amount) => {
        this.setState({
            amount: {
                value: amount,
                valid: false
            }
        }, () => {
            this.validateAmount();
        });
    };

    validateAmount = _.debounce(() => {
        const { amount: tokenAmount, decimals, id } = this.state.selectedToken;
        const { selected } = this.props.accounts;
        const { amount } = this.state;
        if (amount.value === '') {
            return this.setState({
                amount: {
                    valid: false,
                    value: '',
                    error: ''
                }
            });
        }
        const value = new BigNumber(amount.value || 0);
        if (value.isNaN() || value.lte(0)) {
            return this.setState({
                amount: {
                    ...amount,
                    valid: false,
                    error: 'EXCEPTION.SEND.AMOUNT_FORMAT_ERROR'
                }
            });
        } else if (value.gt(tokenAmount)) {
            return this.setState({
                amount: {
                    ...amount,
                    valid: false,
                    error: 'EXCEPTION.SEND.AMOUNT_NOT_ENOUGH_ERROR'
                }
            });
        } else if (value.dp() > decimals) {
            return this.setState({
                amount: {
                    ...amount,
                    valid: false,
                    error: 'EXCEPTION.SEND.AMOUNT_DECIMALS_ERROR',
                    values: { decimals: `${decimals === 0 ? '' : `0.${Array.from({ length: decimals - 1 }, v => 0).join('')}` }1` }
                }
            });
        }
        const notEnoughActivateFee = (id === 0 ? value : new BigNumber(0)).gt(new BigNumber(selected.balance).shiftedBy(-CHAIN_DECIMALS).minus(0.1));
        if (!this.state.recipient.isActivated && notEnoughActivateFee) {
            return this.setState({
                amount: {
                    ...amount,
                    valid: false,
                    error: 'EXCEPTION.SEND.AMOUNT_NOT_ENOUGH_ERROR'
                }
            });
        }
        if (typeof id === 'string' && id.match(/^M/)) {
            const valid = this.state.recipient.isActivated;
            if (valid) {
                const isEnough = new BigNumber(selected.balance).shiftedBy(-CHAIN_DECIMALS).gte(new BigNumber(1));
                // if(selected.netLimit - selected.netUsed < 200 && selected.energy - selected.energyUsed > 10000){
                //     return this.setState({
                //         amount: {
                //             valid:isEnough,
                //             value,
                //             error: 'EXCEPTION.SEND.BANDWIDTH_NOT_ENOUGH_ERROR'
                //         }
                //     });
                // } else if(selected.netLimit - selected.netUsed >= 200 && selected.energy - selected.energyUsed < 10000) {
                //     return this.setState({
                //         amount: {
                //             valid:isEnough,
                //             value,
                //             error: 'EXCEPTION.SEND.ENERGY_NOT_ENOUGH_ERROR'
                //         }
                //     });
                // } else if(selected.netLimit - selected.netUsed < 200 && selected.energy - selected.energyUsed < 10000) {
                //     return this.setState({
                //         amount: {
                //             valid:isEnough,
                //             value,
                //             error: 'EXCEPTION.SEND.BANDWIDTH_ENERGY_NOT_ENOUGH_ERROR'
                //         }
                //     });
                if (selected.netLimit - selected.netUsed < 250) {
                    return this.setState({
                        amount: {
                            ...amount,
                            valid: isEnough,
                            error: 'EXCEPTION.SEND.BANDWIDTH_NOT_ENOUGH_ERROR'
                        }
                    });
                }
                return this.setState({
                    amount: {
                        ...amount,
                        valid: true,
                        error: ''
                    }
                });
            }
            return this.setState({
                amount: {
                    ...amount,
                    valid,
                    error: 'EXCEPTION.SEND.ADDRESS_UNACTIVATED_TRC20_ERROR'
                }
            });
        }
        if (selected.netLimit - selected.netUsed < 250) {
            return this.setState({
                amount: {
                    ...amount,
                    valid: new BigNumber(selected.balance).shiftedBy(-CHAIN_DECIMALS).gte(new BigNumber(1)),
                    error: 'EXCEPTION.SEND.BANDWIDTH_NOT_ENOUGH_ERROR'
                }
            });
        }

        return this.setState({
            amount: {
                ...amount,
                valid: true,
                error: ''
            }
        });
    }, 200);

    clickMaxAmount = () => {
        const { selectedToken } = this.state;
        this.setState({
            amount: {
                value: selectedToken.amount || 0,
                valid: false,
                error: ''
            }
        }, () => {
            this.validateAmount();
        });
    };

    onMemoChange = (e) => {
        const value = e.target.value;
        const memo = {
            value,
            valid: true,
            error: ''
        };
        if (value && Utils.byteLength(value.trim()) > 128) {
            memo.valid = false;
            memo.error = 'EXCEPTION.SEND.MEMO_LENGTH_ERROR';
        }
        this.setState({ memo });
    };

    onConfirmSend() {
        this.setState({
            showConfirm: true
        });
    }

    renderConfirmSend() {
        const { value: recipient } = this.state.recipient;
        const { value: amount } = this.state.amount;
        const { value: memo } = this.state.memo;
        const { selectedToken } = this.state;
        const { selected: sender } = this.props.accounts;
        const symbol = selectedToken.abbr || selectedToken.name;
        const receiverAddress = recipient && recipient.length > 10 ? `${recipient.substr(0, 6) }...${ recipient.substr(-4)}` : recipient;
        const senderAddress = sender && sender.address && sender.address.length > 10 ? `${sender.address.substr(0, 6) }...${ sender.address.substr(-4)}` : sender.address;
        return (
            <div className='popUp'>
                <div className='confirm-transaction'>
                    <div className='title'>
                        <FormattedMessage id='ACCOUNTS.CONFIRM_TRANSACTION' />
                    </div>
                    <div className='popUp__grid'>
                        <div className='popUp__row'>
                            <div><FormattedMessage id='ACCOUNT.SEND.PAY_ACCOUNT' /></div>
                            <div>
                                <div><b>{senderAddress}</b></div>
                                <small>{selectedToken.amount ? new BigNumber(selectedToken.amount).toFormat() : '--'}&nbsp;{symbol}</small>
                            </div>
                        </div>
                        <div className='popUp__row'>
                            <div><FormattedMessage id='ACCOUNT.SEND.RECEIVE_ADDRESS' /></div>
                            <div><b>{receiverAddress}</b></div>
                        </div>
                        <div className='popUp__row'>
                            <div><FormattedMessage id='ACCOUNT.SEND.TRANSFER_AMOUNT' /></div>
                            <div><b>{`${new BigNumber(amount).toFormat()} ${symbol}`}</b></div>
                        </div>
                        {
                            memo ? (
                                <div className='popUp__row'>
                                    <div><FormattedMessage id='ACCOUNT.SEND.MEMO' /></div>
                                    <div><b>{memo.length > 12 ? `${memo.substr(0, 12)}...` : memo}</b></div>
                                </div>
                            ) : null
                        }
                    </div>
                    <div className='buttonRow'>
                        <Button
                            id='BUTTON.CANCEL'
                            type={ BUTTON_TYPE.DANGER }
                            onClick={() => { this.setState({ showConfirm: false }); }}
                            tabIndex={ 1 }
                        />
                        <Button
                            id='BUTTON.CONFIRM'
                            onClick={() => { this.onSend();this.setState({ showConfirm: false }); }}
                            tabIndex={ 1 }
                        />
                    </div>
                </div>
            </div>
        );
    }

    onSend = () => {
        BigNumber.config({ EXPONENTIAL_AT: [-20, 30] });
        this.setState({
            loading: true,
            success: false
        });
        const { formatMessage } = this.props.intl;
        const { value: recipient } = this.state.recipient;
        const { value: amount } = this.state.amount;
        const memo = this.state.memo.value ? this.state.memo.value.trim() : '';

        const {
            id,
            decimals
        } = this.state.selectedToken;

        let func;
        if(id === 0) {
            func = PopupAPI.sendMcash(
                recipient,
                new BigNumber(amount).shiftedBy(CHAIN_DECIMALS).toString(),
                memo
            );
        } else if(typeof id === 'string' && id.match(/^M/)) {
            func = PopupAPI.sendSmartToken(
                recipient,
                new BigNumber(amount).shiftedBy(decimals).toString(),
                id
            );
        } else {
            let tokenId = id;
            if (typeof id === 'string')
                tokenId = parseInt(id);

            func = PopupAPI.sendBasicToken(
                recipient,
                new BigNumber(amount).shiftedBy(decimals).toString(),
                tokenId,
                memo
            );
        }

        func.then(res => {
            const txId = res && res.transaction ? res.transaction.tx_id : '';
            const swalOptions = {
                type: 'success',
                title: formatMessage({ id: 'SEND.SUCCESS' }),
                text: '',
                onAfterClose: this.onCancel
            };
            if (txId)
                swalOptions.footer = `<a href="${MCASHSCAN_URL}/transaction/${txId}" rel='noopener noreferrer' target='_blank'><small>${ formatMessage({ id: 'TIP.VIEW_ON_EXPLORER' }) }</small></a>`;
            swal(swalOptions);
            this.setState({
                loading: false
            }, () => {
                setTimeout(() => {
                    this.validateAmount();
                }, 1000);
            });
        }).catch(error => {
            const errorMessage = typeof error === 'string' ? Utils.prettyErrorMessage(error) : JSON.stringify(error);
            swal(errorMessage, '', 'error');
            this.setState({
                loading: false
            });
        });
    };

    onCancel = () => {
        const { selected, selectedToken = {} } = this.props.accounts;
        const token10DefaultImg = require('@mcashlight/popup/src/assets/images/new/token_10_default.png');
        if(+selected.dealCurrencyPage === 1) {
            const selectedCurrency = {
                ...selectedToken,
                // id: selectedToken.id,
                // name: selectedToken.name,
                abbr: selectedToken.abbr || selectedToken.symbol,
                // decimals: selectedToken.decimals,
                // amount: selectedToken.amount,
                // price: selectedToken.price,
                imgUrl: selectedToken.imgUrl ? selectedToken.imgUrl : token10DefaultImg
            };
            if(selectedToken.id === 0) {
                selectedCurrency.frozenBalance = new BigNumber(selected.frozenBalance)
                    .shiftedBy(-selectedToken.decimals)
                    .toString();
                selectedCurrency.balance = new BigNumber(selected.balance)
                    .shiftedBy(-selectedToken.decimals)
                    .toString();
                selectedCurrency.stakeBalance = new BigNumber(selected.stakeBalance)
                    .shiftedBy(-selectedToken.decimals)
                    .toString();
                selectedCurrency.amount = new BigNumber(selectedCurrency.balance || 0)
                    .plus(selectedCurrency.frozenBalance || 0)
                    .plus(selectedCurrency.stakeBalance || 0)
                    .toString();
            }
            PopupAPI.setSelectedToken(selectedCurrency);
            PopupAPI.changeState(APP_STATE.TRANSACTIONS);
            PopupAPI.changeDealCurrencyPage(0);
        }else
            PopupAPI.changeState(APP_STATE.READY);
    }

    supportedMemo = () => {
        const selectedToken = this.state.selectedToken || {};
        return !selectedToken.id || !isNaN(selectedToken.id);
    };

    render() {
        const { formatMessage } = this.props.intl;
        const { isOpen, selectedToken, loading, amount, recipient, showConfirm, memo } = this.state;
        const { selected, accounts } = this.props.accounts;
        const mcash = { tokenId: 0, name: 'Mcash', balance: selected.balance, abbr: 'MCASH', decimals: CHAIN_DECIMALS, imgUrl: mcashImg };
        let tokens = { ...selected.tokens.basic, ...selected.tokens.smart };
        tokens = Utils.dataLetterSort(Object.entries(tokens).filter(([tokenId, token]) => typeof token === 'object' ).map(v => { v[ 1 ].tokenId = v[ 0 ];return v[ 1 ]; }), 'name');
        tokens = [mcash, ...tokens];
        const supportedMemo = this.supportedMemo();
        return (
            <div className='insetContainer send' onClick={() => { this.setState({ isOpen: { account: false, token: false } }); }}>
                {showConfirm ? this.renderConfirmSend() : null}
                <div className='pageHeader'>
                    <div className='back' onClick={ this.onCancel } />
                    <FormattedMessage id='ACCOUNT.SEND'/>
                </div>
                <div className='greyModal'>
                    <div className='input-group'>
                        <label><FormattedMessage id='ACCOUNT.SEND.PAY_ACCOUNT'/></label>
                        <div className={`input dropDown${isOpen.account ? ' isOpen' : ''}`} onClick={ (e) => { e.stopPropagation();isOpen.token = false ;isOpen.account = !isOpen.account; this.setState({ isOpen }); } }>
                            <div className='selected'>{ selected.address }</div>
                            <div className='dropWrap' style={isOpen.account ? (Object.entries(accounts).length <= 5 ? { height: 48 * Object.entries(accounts).length } : { height: 180, overflow: 'scroll' }) : {}}>
                                {
                                    Object.entries(accounts).map(([address], index) => (
                                        <div
                                            key={`payment-${index}`}
                                            onClick={(e) => { this.changeAccount(address, e); }}
                                            className={`dropItem multiple-line${address === selected.address ? ' selected' : ''}`}
                                        >
                                            <div className={'name'}>
                                                <small>{accounts[ address ] ? accounts[ address ].name : 'Wallet'}:</small>
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
                    <div className={`input-group${recipient.error ? ' error' : ''}`}>
                        <label><FormattedMessage id='ACCOUNT.SEND.RECEIVE_ADDRESS'/></label>
                        <div className='input'>
                            <input
                                value={recipient.value || ''}
                                type='text'
                                onChange={(e) => this.onRecipientChange(e.target.value)}
                            />
                        </div>
                        <div className='tipError'>
                            {recipient.error ? <FormattedMessage id={recipient.error} /> : null}
                        </div>
                    </div>
                    <div className='input-group'>
                        <label><FormattedMessage id='ACCOUNT.SEND.CHOOSE_TOKEN'/></label>
                        <div className={`input dropDown${isOpen.token ? ' isOpen' : ''}`} onClick={ (e) => { e.stopPropagation();isOpen.account = false;isOpen.token = !isOpen.token; this.setState({ isOpen }); } }>
                            <div className='selected'>
                                <span title={`${selectedToken.abbr || selectedToken.name} (${selectedToken.amount})`}>{`${selectedToken.abbr || selectedToken.name} (${selectedToken.amount})`}</span>
                                {
                                    selectedToken.id !== 0 ? (
                                        <span>id:{selectedToken.id.length === 7 ? selectedToken.id : `${selectedToken.id.substr(0, 6)}...${selectedToken.id.substr(-6)}`}</span>
                                    ) : ''
                                }
                            </div>
                            <div className='dropWrap' style={isOpen.token ? (tokens.length <= 5 ? { height: 36 * tokens.length } : { height: 180, overflow: 'scroll' }) : {}}>
                                {
                                    tokens.filter(({ balance }) => balance > 0).map(({ tokenId: id, balance, name, decimals, abbr }, index) => {
                                        const BN = BigNumber.clone({
                                            DECIMAL_PLACES: decimals,
                                            ROUNDING_MODE: Math.min(8, decimals)
                                        });
                                        const amount = new BN(balance)
                                            .shiftedBy(-decimals)
                                            .toString();
                                        return (
                                            <div
                                                key={`token-${index}`}
                                                onClick={(e) => { this.changeToken({ id, amount, name, decimals, abbr }, e); }}
                                                className={`dropItem${id === selectedToken.id ? ' selected' : ''}`}
                                            >
                                                <span title={`${abbr || name}(${amount})`}>{`${abbr || name} (${amount})`}</span>
                                                {
                                                    id !== 0 && typeof id === 'string' ? (
                                                        <span>id:{id.length === 7 ? id : `${id.substr(0, 6)}...${id.substr(-6)}`}</span>
                                                    ) : ''
                                                }
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        </div>
                    </div>
                    <div className={`input-group ${+amount.value && amount.error ? ' error' : ''}`}>
                        <label><FormattedMessage id='ACCOUNT.SEND.TRANSFER_AMOUNT'/></label>
                        <div className='input'>
                            <input
                                value={amount.value || ''}
                                type='text'
                                onChange={e => this.onAmountChange(e.target.value)}
                            />
                            <button
                                disabled={ amount.value === selectedToken.amount ? 'disabled' : false }
                                className={'max'}
                                onClick={this.clickMaxAmount}
                            >
                                {formatMessage({ id: 'BUTTON.MAX' })}
                            </button>
                        </div>
                        <div className='tipError'>
                            {+amount.value && amount.error ? (amount.values ? <FormattedMessage id={amount.error} values={amount.values} /> : <FormattedMessage id={amount.error} />) : null}
                        </div>
                    </div>
                    <div className={`input-group hasBottomMargin${memo.error ? ' error' : ''}${supportedMemo ? '' : ' disabled'}`}>
                        <label>
                            <FormattedMessage id='ACCOUNT.SEND.MEMO'/>
                            <small>&nbsp;({ formatMessage({ id: 'ACCOUNT.SEND.OPTIONAL' }) })</small>
                        </label>
                        <div className='input'>
                            <input
                                value={memo.value || ''}
                                type='text' disabled={ supportedMemo ? false : 'disabled' }
                                onChange={e => this.onMemoChange(e) }
                            />
                        </div>
                        <div className='tipError'>
                            {memo.error ? <FormattedMessage id={memo.error} /> : null}
                        </div>
                    </div>
                    <Button
                        id='ACCOUNT.SEND'
                        isLoading={ loading }
                        isValid={ amount.valid && recipient.valid && memo.valid }
                        renderIcon={() => <span className={'c-icon icon-send'} />}
                        onClick={ () => this.onConfirmSend() }
                    />
                </div>
            </div>
        );
    }
}

export default connect(state => ({
    inputDefault: state.sending.inputDefault
}), {
    resetInputDefault
})(injectIntl(SendController));
