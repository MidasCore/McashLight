import React from 'react';
import AccountDetails from '@mcashlight/popup/src/components/AccountDetails';
import CustomScroll from 'react-custom-scroll';
import Input from '@mcashlight/popup/src/components/Input';
import Button from '@mcashlight/popup/src/components/Button';
import McashWeb from 'mcashweb';
import Dropdown from 'react-dropdown';

import { connect } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import { VALIDATION_STATE } from '@mcashlight/lib/constants';
import { PopupAPI } from '@mcashlight/lib/api';

import {
    FormattedMessage,
    injectIntl
} from 'react-intl';

import './SendPage.scss';

const TOKEN_MODE = {
    MCASH: 'MCASH',
    M1: 'M1',
    M20: 'M20'
};

class SendPage extends React.Component {
    state = {
        recipient: {
            valid: VALIDATION_STATE.NONE,
            value: ''
        },
        amount: {
            valid: VALIDATION_STATE.NONE,
            value: ''
        },
        token: {
            mode: TOKEN_MODE.MCASH
        },
        success: false,
        error: false,
        isLoading: false
    };

    constructor({ onPageChange }) {
        super();

        this.onRecipientChange = this.onRecipientChange.bind(this);
        this.onAmountChange = this.onAmountChange.bind(this);
        this.onTokenChange = this.onTokenChange.bind(this);
        this.onModeChange = this.onModeChange.bind(this);
        this.onSend = this.onSend.bind(this);
    }

    reset() {
        this.onAmountChange('0');
        this.onModeChange(TOKEN_MODE.MCASH);
    }

    onRecipientChange(address) {
        address = address.trim();

        const recipient = {
            value: address,
            valid: VALIDATION_STATE.NONE
        };

        if(!address.length)
            return this.setState({ recipient });

        if(!McashWeb.isAddress(address))
            recipient.valid = VALIDATION_STATE.INVALID;
        else recipient.valid = VALIDATION_STATE.VALID;

        this.setState({
            recipient
        });
    }

    onAmountChange(amount) {
        amount = amount.trim();

        this.setState({
            amount: {
                value: amount,
                valid: VALIDATION_STATE.NONE
            }
        }, () => this.validateAmount());
    }

    onTokenChange({ value: token }) {
        const { mode } = this.state.token;

        const {
            basic,
            smart
        } = this.props.tokens;

        if(mode === TOKEN_MODE.M1) {
            return this.setState({
                token: {
                    tokenID: token,
                    decimals: basic [ token ].decimals,
                    name: basic[ token ].name,
                    mode
                }
            }, () => this.validateAmount());
        }

        this.setState({
            token: {
                address: token,
                decimals: smart[ token ].decimals,
                mode
            }
        }, () => this.validateAmount());
    }

    onModeChange(mode) {
        const {
            basic,
            smart
        } = this.props.tokens;

        const token = {
            mode
        };

        if(mode === TOKEN_MODE.M1 && !Object.keys(basic).length)
            return;

        if(mode === TOKEN_MODE.M20 && !Object.keys(smart).length)
            return;

        if(mode === TOKEN_MODE.M1) {
            token.tokenID = Object.keys(basic)[ 0 ];
            token.decimals = basic [ token.tokenID ].decimals;
            token.name = basic[ token.tokenID ].name;
        }

        if(mode === TOKEN_MODE.M20) {
            token.address = Object.keys(smart)[ 0 ];
            token.decimals = Object.values(smart)[ 0 ].decimals;
        }

        this.setState({
            token
        }, () => this.validateAmount());
    }

    validateAmount() {
        const {
            mode,
            tokenID,
            address,
            decimals
        } = this.state.token;
        const {
            basic,
            smart
        } = this.props.tokens;

        const { value } = this.state.amount;
        const amount = new BigNumber(value.trim());

        if(
            amount.isNaN() ||
            amount.lte(0) ||
            (
                mode === TOKEN_MODE.M1 && decimals == 0 &&
                !amount.isInteger()
            )
        ) {
            return this.setState({
                amount: {
                    valid: VALIDATION_STATE.INVALID,
                    value
                }
            });
        }

        let balance = new BigNumber(0);

        if(mode === TOKEN_MODE.MCASH)
            balance = new BigNumber(this.props.account.balance).shiftedBy(-8);

        if(mode === TOKEN_MODE.M1) {
            const token = basic[ tokenID ];

            balance = new BigNumber(token.balance)
                .shiftedBy(decimals);
        }

        if(mode === TOKEN_MODE.M20) {
            const token = smart[ address ];

            balance = new BigNumber(token.balance)
                .shiftedBy(-decimals);
        }

        this.setState({
            amount: {
                valid: amount.lte(balance) ?
                    VALIDATION_STATE.VALID :
                    VALIDATION_STATE.INVALID,
                value
            }
        });
    }

    onSend() {
        this.setState({
            isLoading: true,
            success: false
        });

        const { value: recipient } = this.state.recipient;
        const { value: amount } = this.state.amount;

        const {
            mode,
            tokenID,
            address,
            decimals
        } = this.state.token;

        let func;

        if(mode === TOKEN_MODE.MCASH) {
            func = PopupAPI.sendMcash(
                recipient,
                new BigNumber(amount).shiftedBy(8).toString()
            );
        }

        if(mode === TOKEN_MODE.M1) {
            func = PopupAPI.sendBasicToken(
                recipient,
                new BigNumber(amount).shiftedBy(decimals).toString(),
                tokenID
            );
        }

        if(mode === TOKEN_MODE.M20) {
            func = PopupAPI.sendSmartToken(
                recipient,
                new BigNumber(amount).shiftedBy(decimals).toString(),
                address
            );
        }

        func.then(() => {
            this.setState({
                error: false,
                success: true,
                isLoading: false,
                recipient: {
                    valid: VALIDATION_STATE.NONE,
                    value: ''
                }
            });

            this.reset();
        }).catch(error => (
            this.setState({
                success: false,
                isLoading: false,
                error
            })
        ));
    }

    renderRecipient() {
        const {
            valid,
            value
        } = this.state.recipient;

        const { isLoading } = this.state;

        return (
            <div className='recipient hasBottomMargin'>
                <FormattedMessage id='SEND.RECIPIENT' />
                <Input
                    value={ value }
                    placeholder='SEND.RECIPIENT.PLACEHOLDER'
                    status={ valid }
                    onChange={ this.onRecipientChange }
                    isDisabled={ isLoading }
                />
            </div>
        );
    }

    renderBasicDropdown() {
        const { basic } = this.props.tokens;
        const { formatNumber } = this.props.intl;
        const { isLoading } = this.state;

        const {
            tokenID,
            name,
            decimals
        } = this.state.token;

        const options = Object.entries(basic).map(([ tokenID, token ]) => ({
            value: tokenID,
            label: `${ token.name } (${ formatNumber(new BigNumber(token.balance).shiftedBy(-token.decimals)) })${tokenID}`
        }));

        if(!basic[ tokenID ]) {
            this.reset();
            return null;
        }

        const selected = {
            value: tokenID,
            label: `${ name } (${ formatNumber(new BigNumber(basic[ tokenID ].balance).shiftedBy(-decimals)) })${tokenID}`
        };

        return (
            <Dropdown
                className='dropdown'
                options={ options }
                value={ selected }
                onChange={ this.onTokenChange }
                disabled={ isLoading }
            />
        );
    }

    renderSmartDropdown() {
        const { smart } = this.props.tokens;
        const { address } = this.state.token;
        const { formatNumber } = this.props.intl;
        const { isLoading } = this.state;

        const options = Object.entries(smart).map(([ address, { balance, decimals, symbol } ]) => ({
            value: address,
            label: `${ symbol } (${ formatNumber(new BigNumber(balance).shiftedBy(-decimals)) })`
        }));

        const token = smart[ address ];

        if(!token) {
            this.reset();
            return null;
        }

        const selected = {
            value: address,
            label: `${ token.symbol } (${ formatNumber(new BigNumber(token.balance).shiftedBy(-token.decimals)) })`
        };

        return (
            <Dropdown
                className='dropdown'
                options={ options }
                value={ selected }
                onChange={ this.onTokenChange }
                disabled={ isLoading }
            />
        );
    }

    renderAmount() {
        const { mode } = this.state.token;
        const { value } = this.state.amount;
        const { isLoading } = this.state;

        return (
            <div className='tokens'>
                <div className='tabs'>
                    <FormattedMessage
                        id='SEND.TOKENS.MCASH'
                        children={ token => (
                            <div
                                className={ `token ${ mode === TOKEN_MODE.MCASH ? 'active' : '' }` }
                                onClick={ () => this.onModeChange(TOKEN_MODE.MCASH) }
                            >
                                { token }
                            </div>
                        ) }
                    />
                    <FormattedMessage
                        id='SEND.TOKENS.M1'
                        children={ token => (
                            <div
                                className={ `token ${ mode === TOKEN_MODE.M1 ? 'active' : '' }` }
                                onClick={ () => this.onModeChange(TOKEN_MODE.M1) }
                            >
                                { token }
                            </div>
                        ) }
                    />
                    <FormattedMessage
                        id='SEND.TOKENS.M20'
                        children={ token => (
                            <div
                                className={ `token ${ mode === TOKEN_MODE.M20 ? 'active' : '' }` }
                                onClick={ () => this.onModeChange(TOKEN_MODE.M20) }
                            >
                                { token }
                            </div>
                        ) }
                    />
                </div>
                <div className={ `amount ${ mode === TOKEN_MODE.MCASH ? 'noLeftRadius' : '' } ${ mode === TOKEN_MODE.M20 ? 'noRightRadius' : '' }` }>
                    <div className='inputContainer'>
                        <Input
                            value={ value }
                            placeholder='SEND.AMOUNT.PLACEHOLDER'
                            onChange={ this.onAmountChange }
                            isDisabled={ isLoading }
                        />
                        {
                            mode === TOKEN_MODE.MCASH ?
                                <span>MCASH</span> :
                                mode === TOKEN_MODE.M1 ?
                                    this.renderBasicDropdown() :
                                    this.renderSmartDropdown()
                        }
                    </div>
                    <Button
                        id={ `SEND.BUTTON.${ mode }` }
                        isLoading={ isLoading }
                        isValid={
                            this.state.amount.valid === VALIDATION_STATE.VALID &&
                            this.state.recipient.valid === VALIDATION_STATE.VALID
                        }
                        onClick={ this.onSend }
                    />
                </div>
            </div>
        );
    }

    render() {
        const {
            error,
            success
        } = this.state;

        return (
            <div className='sendPage'>
                <AccountDetails />
                <div className='sendDetails'>
                    <CustomScroll heightRelativeToParent='100%'>
                        { error ? (
                            <div className='error'>
                                <FormattedMessage id='ERRORS.SEND' />
                                <span className='errorMessage'>
                                    { error }
                                </span>
                            </div>
                        ) : '' }
                        { success ? (
                            <div className='success'>
                                <FormattedMessage id='SEND.SUCCESS' />
                            </div>
                        ) : '' }
                        { this.renderRecipient() }
                        { this.renderAmount() }
                    </CustomScroll>
                </div>
            </div>
        );
    }
}

export default injectIntl(
    connect(state => ({
        account: state.accounts.selected,
        tokens: state.accounts.selected.tokens
    }))(SendPage)
);
