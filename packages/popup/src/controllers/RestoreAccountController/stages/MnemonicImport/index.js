import React from 'react';
import Button from '@mcashlight/popup/src/components/Button';
import Utils from '@mcashlight/lib/utils';
import Toast, { T } from 'react-toast-mobile';
import { connect } from 'react-redux';
import { FormattedMessage, injectIntl } from 'react-intl';
import { BigNumber } from 'bignumber.js';
// import NodeService from '@mcashlight/backgroundScript/services/NodeService';
import { PopupAPI } from '@mcashlight/lib/api';

import './MnemonicImport.scss';
// NodeService.init();
const IMPORT_STAGE = {
    ENTERING_MNEMONIC: 0,
    SELECTING_ACCOUNTS: 1
};

class MnemonicImport extends React.Component {
    state = {
        addresses: [],
        selected: [],
        subStage: IMPORT_STAGE.ENTERING_MNEMONIC,
        mnemonic: '',
        isValid: false,
        isLoading: false,
        error: '',
        coinTypes: [
            { value: '2048', path: 'm/44\'/2048\'/0\'/0', name: '(Default) McashLight (MCASH)' },
            { value: '60', path: 'm/44\'/60\'/0\'/0', name: 'MidasWallet, Metamask, Trezor' }
        ],
        isOpen: false,
        selectedCoinType: '2048'
    };

    constructor() {
        super();

        this.onChange = this.onChange.bind(this);
        this.changeStage = this.changeStage.bind(this);
        this.toggleAddress = this.toggleAddress.bind(this);
        this.import = this.import.bind(this);
    }

    onChange({ target: { value } }) {
        const isValid = Utils.validateMnemonic(value);
        const error = !isValid ? 'EXCEPTION.FORMAT_ERROR' : '';
        this.setState({
            mnemonic: value,
            isValid,
            error
        });
    }

    async changeStage(newStage) {
        if(newStage === IMPORT_STAGE.SELECTING_ACCOUNTS) {
            const res = await this.generateAccounts();
            if(!res) {
                return false;
            }
        }
        this.setState({
            subStage: newStage
        });
    }

    changeCoinType(e, value) {
        e.stopPropagation();
        this.setState({
            selectedCoinType: value,
            isOpen: false
        });
    }

    async generateAccounts() {
        // Move this to Utils (generateXAccounts)

        this.setState({
            isLoading: true
        });

        const { mnemonic, selectedCoinType } = this.state;
        const { formatMessage } = this.props.intl;
        const addresses = [];
        for(let i = 0; i < 5; i++) {
            const account = Utils.getAccountAtIndex(
                mnemonic,
                i,
                selectedCoinType
            );
            if(!(account.address in this.props.accounts)) {
                // let { balance, frozen_for_bandwidth, frozen_for_energy, stake } = await NodeService.mcashWeb.mcash.getUnconfirmedAccount(account.address);
                let { balance, frozen_for_bandwidth, frozen_for_energy, stake, witness_stake } = await PopupAPI.getAccountInfo(account.address);
                balance = balance ? balance : 0;
                const frozenBalanceForBandwidth = frozen_for_bandwidth && frozen_for_bandwidth.frozen_balance ? frozen_for_bandwidth.frozen_balance : 0;
                const frozenBalanceForEnergy = frozen_for_energy && frozen_for_energy.frozen_balance ? frozen_for_energy.frozen_balance : 0;
                const frozenBalance = new BigNumber(frozenBalanceForBandwidth).plus(new BigNumber(frozenBalanceForEnergy));
                const witnessStakeBalance = witness_stake && witness_stake.stake_amount ? witness_stake.stake_amount : 0;
                const stakeBalance = stake && stake.stake_amount ? stake.stake_amount : 0;
                const totalStake = new BigNumber(witnessStakeBalance).plus(new BigNumber(stakeBalance));
                account.balance = new BigNumber(balance).plus(frozenBalance).plus(totalStake).toNumber();
                addresses.push(account);
            }
        }
        if(addresses.length === 0) {
            this.setState({
                isLoading: false
            });
            T.notify(formatMessage({id:'CHOOSING_TYPE.MNEMONIC.NO_OPTIONS'}))
            return false;
        }else {
            this.setState({
                addresses,
                isLoading: false
            });
            return true;
        }
    }

    toggleAddress(index) {
        let { selected } = this.state;

        if(selected.includes(index))
            selected = selected.filter(addressIndex => addressIndex !== index);
        else selected.push(index);

        this.setState({
            selected
        });
    }

    import() {
        this.setState({
            isLoading: true
        });

        const {
            addresses,
            selected
        } = this.state;

        const { name } = this.props;
        const isSingle = selected.length === 1;

        selected.forEach((internalIndex, index) => {
            const { privateKey } = addresses[ internalIndex ];
            const walletName = isSingle ? name : `${ name } #${ index + 1 }`;

            return PopupAPI.importAccount(
                privateKey,
                walletName
            );
        });

        PopupAPI.resetState();
    }

    renderAccounts() {
        const {
            addresses,
            selected,
            isLoading
        } = this.state;

        const isValid = !!selected.length;

        return (
            <div className='insetContainer mnemonicImport'>
                <div className='pageHeader'>
                    <div className="back" onClick={ () => this.changeStage(IMPORT_STAGE.ENTERING_MNEMONIC) }></div>
                    <FormattedMessage id="CREATION.RESTORE.MNEMONIC.RELATED_TO.ACCOUNT.TITLE" />
                </div>
                <div className='greyModal'>
                    <div className='modalDesc'>
                        <FormattedMessage id='MNEMONIC_IMPORT.SELECTION' />
                    </div>
                    <div className='addressList'>
                        { addresses.map(({ address,balance }, index) => {
                            const isSelected = selected.includes(index);
                            // const icon = isSelected ? 'dot-circle' : 'circle';
                            const className = `addressOption ${ isSelected ? 'isSelected' : '' } ${ isLoading ? 'isLoading' : '' }`;

                            return (
                                <div
                                    className={ className }
                                    key={ index }
                                    tabIndex={ index + 1 }
                                    onClick={ () => !isLoading && this.toggleAddress(index) }
                                >
                                    <div className={ `checkbox ${ isSelected ? 'isSelected' : '' }` }>&nbsp;</div>
                                    <span className="address">
                                        <span>{ `${address.substr(0,10)}...${address.substr(-10)}` }</span>
                                        <span><FormattedMessage id="COMMON.BALANCE" /> <FormattedMessage id="ACCOUNT.BALANCE" values={{amount:balance/100000000}} /></span>
                                    </span>
                                </div>
                            );
                        }) }
                    </div>
                    <div className='buttonRow'>
                        <Button
                            id='BUTTON.IMPORT'
                            isValid={ isValid }
                            onClick={ () => isValid && this.import() }
                            tabIndex={ addresses.length + 1 }
                            isLoading={ isLoading }
                        />
                    </div>
                </div>
            </div>
        );
    }

    renderInput() {
        const { onCancel } = this.props;
        const {
            mnemonic,
            isValid,
            isLoading,
            error,
            coinTypes,
            isOpen,
            selectedCoinType
        } = this.state;

        const selectedItem = coinTypes.find(item => item.value === selectedCoinType);

        return (
            <div className='insetContainer mnemonicImport' onClick={() => { this.setState({isOpen: false}) }}>
                <div className='pageHeader'>
                    <div className="back" onClick={ onCancel }></div>
                    <FormattedMessage id="CREATION.RESTORE.MNEMONIC.TITLE" />
                </div>
                <div className={'greyModal'+(!isValid && error?' error':'')}>
                    <Toast />
                    <div className='modalDesc'>
                        <FormattedMessage id='MNEMONIC_IMPORT.DESC' />
                    </div>
                    <div className="inputUnit" style={{ marginBottom: '10px' }}>
                        <textarea
                            placeholder='Mnemonic Import'
                            className='phraseInput'
                            rows={ 5 }
                            value={ mnemonic }
                            onChange={ this.onChange }
                            tabIndex={ 1 }
                            disabled={ isLoading }
                        />
                        {!isValid?<div className="tipError">{error?<FormattedMessage id={error} />:null}</div>:null}
                    </div>
                    <div className="input-group" style={{ marginBottom: '20px' }}>
                        <label>{ 'Select HD derivation path:' }</label>
                        <div
                            className={ 'input dropDown' + (isOpen ? ' isOpen' : '')}
                            onClick={(e) => {
                                e.stopPropagation();
                                this.setState(prevState => ({ isOpen: !prevState.isOpen }));
                            }}
                        >
                            <div className="selected" style={{ justifyContent: 'flex-start' }}>
                                <b>{ selectedItem.path }</b>&nbsp;<span>{ selectedItem.name || '2048' }</span>
                            </div>
                            <div className="dropWrap" style={isOpen ? { height: 36 * coinTypes.length } : {}}>
                                {
                                    coinTypes.map(item => (
                                        <div
                                            onClick={(e) => { this.changeCoinType(e, item.value) }}
                                            className={ 'dropItem' + (selectedCoinType === item.value ? ' selected' : '') }
                                            style={{ justifyContent: 'flex-start' }}
                                        >
                                            <b>{ item.path }</b>&nbsp;<span>{ item.name }</span>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                    <div className='buttonRow'>
                        <Button
                            id='BUTTON.CONTINUE'
                            isValid={ isValid }
                            onClick={ () => isValid && this.changeStage(IMPORT_STAGE.SELECTING_ACCOUNTS) }
                            tabIndex={ 2 }
                            isLoading={ isLoading }
                        />
                    </div>
                </div>
            </div>
        );
    }

    render() {
        const { subStage } = this.state;

        if(subStage === IMPORT_STAGE.ENTERING_MNEMONIC)
            return this.renderInput();

        return this.renderAccounts();
    }
}

export default injectIntl(
    connect(state => ({
        accounts: state.accounts.accounts
    }))(MnemonicImport)
);
