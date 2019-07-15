import React from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import { BigNumber } from 'bignumber.js';
import { PopupAPI } from '@mcashlight/lib/api';
import Button from '@mcashlight/popup/src/components/Button';
import { VALIDATION_STATE, APP_STATE, BUTTON_TYPE } from '@mcashlight/lib/constants';
import McashWeb from 'mcashweb';
// import NodeService from '@mcashlight/backgroundScript/services/NodeService';
import swal from 'sweetalert2';
import Utils  from '@mcashlight/lib/utils';
import Logger from '@mcashlight/lib/logger';
import { CHAIN_DECIMALS, CHAIN_SYMBOL } from '../config/constants';

const mcashImg = require('@mcashlight/popup/src/assets/images/new/mcash.png');
const logger = new Logger('SendController');

class SendController extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isOpen:{
                account:false,
                token:false
            },
            selectedToken:{
                id: 0,
                name:'MCASH',
                amount: 0,
                decimals: 8
            },
            recipient:{
                error:'',
                value:'',
                valid:false,
                isActivated:true
            },
            amount:{
                error:'',
                value:0,
                valid:false,
                values:''
            },
            loading:false,
            showConfirm: false
        }
    }

    componentDidMount() {
        let {selectedToken,selected} = this.props.accounts;
        selectedToken.amount = selectedToken.id === 0 ? selected.balance / Math.pow(10 , 8) : selectedToken.amount;
        this.setState({selectedToken});
    }

    componentWillReceiveProps(nextProps) {
        const { selected } = nextProps.accounts;
        const { selectedToken } = this.state;
        if(selectedToken.id === 0) {
            selectedToken.amount = selected.balance / Math.pow(10, 8);
        } else {
            if (!isNaN(selectedToken.id)) {
                selectedToken.amount = selected.tokens.basic[selectedToken.id].balance / Math.pow(10, selected.tokens.basic[selectedToken.id].decimals);
            } else if(typeof selectedToken.id === 'string' && selectedToken.id.match(/^M/)) {
                selectedToken.amount = selected.tokens.smart[selectedToken.id].balance / Math.pow(10, selected.tokens.smart[selectedToken.id].decimals);
            }
        }
        this.setState({selectedToken});
    }

    changeToken(selectedToken,e) {
        e.stopPropagation();
        const {isOpen} = this.state;
        isOpen.token = !isOpen.token;
        this.setState({isOpen,selectedToken},() => this.validateAmount());
        PopupAPI.setSelectedToken(selectedToken);
    }

    changeAccount(address,e) {
        e.stopPropagation();
        const {isOpen} = this.state;
        isOpen.account = !isOpen.account;
        const { selected,accounts } = this.props.accounts;
        const selectedToken = {
            id: 0,
            name: 'MCASH',
            decimals: 8,
            amount: new BigNumber(accounts[address].balance).shiftedBy(-8).toString()
        };
        this.setState({isOpen,selectedToken},()=>{this.validateAmount()});
        if(selected.address === address)
            return;
        PopupAPI.selectAccount(address);
    }

    async onRecipientChange(e) {
        const { selected } = this.props.accounts;
        const address = e.target.value;

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
        this.setState({
            recipient
        });
    }

    onAmountChange(e) {
        const amount = e.target.value;
        this.setState({
            amount: {
                value: amount,
                valid: false
            }
        }, () => {
            this.validateAmount()
        });
    }

    validateAmount() {
        const {
            amount,
            decimals,
            id
        } = this.state.selectedToken;
        const { selected } = this.props.accounts;
        let {value} = this.state.amount;
        if(value === '') {
            return this.setState({
                amount: {
                    valid: false,
                    value,
                    error:''
                }
            });
        }
        value = new BigNumber(value || 0);
        if(value.isNaN() || value.lte(0)) {
            return this.setState({
                amount: {
                    valid: false,
                    value: value.toString(),
                    error:'EXCEPTION.SEND.AMOUNT_FORMAT_ERROR'
                }
            });
        }else if(value.gt(amount)) {
            return this.setState({
                amount: {
                    valid: false,
                    value: value.toString(),
                    error:'EXCEPTION.SEND.AMOUNT_NOT_ENOUGH_ERROR'
                }
            });
        }else if(value.dp() > decimals) {
            return this.setState({
                amount: {
                    valid: false,
                    value: value.toString(),
                    error:'EXCEPTION.SEND.AMOUNT_DECIMALS_ERROR',
                    values:{decimals:(decimals===0?'':'0.'+Array.from({length:decimals-1},v=>0).join(''))+'1'}
                }
            });
        } else {
            if(!this.state.recipient.isActivated && value.gt(new BigNumber(selected.balance).shiftedBy(-8).minus(0.1))) {
                return this.setState({
                    amount: {
                        valid: false,
                        value: value.toString(),
                        error:'EXCEPTION.SEND.AMOUNT_NOT_ENOUGH_ERROR'
                    }
                });
            }
            if(typeof id === 'string' && id.match(/^M/)) {
                const valid = this.state.recipient.isActivated ? true : false;
                if(valid) {
                    const isEnough = new BigNumber(selected.balance).shiftedBy(-8).gte(new BigNumber(1)) ? true : false;
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
                    if(selected.netLimit - selected.netUsed < 250){
                        return this.setState({
                            amount: {
                                valid: isEnough,
                                value: value.toString(),
                                error: 'EXCEPTION.SEND.BANDWIDTH_NOT_ENOUGH_ERROR'
                            }
                        });

                    } else {
                        return this.setState({
                            amount: {
                                valid: true,
                                value: value.toString(),
                                error: ''
                            }
                        });
                    }
                } else {
                    return this.setState({
                        amount: {
                            valid,
                            value: value.toString(),
                            error: 'EXCEPTION.SEND.ADDRESS_UNACTIVATED_TRC20_ERROR'
                        }
                    });
                }
            } else {
                if(selected.netLimit - selected.netUsed < 250){
                    return this.setState({
                        amount: {
                            valid: new BigNumber(selected.balance).shiftedBy(-8).gte(new BigNumber(1)),
                            value: value.toString(),
                            error: 'EXCEPTION.SEND.BANDWIDTH_NOT_ENOUGH_ERROR'
                        }
                    });
                } else {
                    return this.setState({
                        amount: {
                            valid: true,
                            value: value.toString(),
                            error: ''
                        }
                    });
                }

            }
            return this.setState({
                amount: {
                    valid: true,
                    value: value.toString(),
                    error: ''
                }
            });
        }
    }

    onConfirmSend() {
        this.setState({
            showConfirm: true
        });
    }

    renderConfirmSend() {
        const { value: recipient } = this.state.recipient;
        const { value: amount } = this.state.amount;
        const { selectedToken } = this.state;
        const { selected: sender } = this.props.accounts;
        const symbol = selectedToken.abbr ? selectedToken.abbr : selectedToken.name;
        const receiverAddress = recipient && recipient.length > 10 ? recipient.substr(0, 6) + '...' + recipient.substr(-4) : recipient;
        const senderAddress = sender && sender.address && sender.address.length > 10 ? sender.address.substr(0, 6) + '...' + sender.address.substr(-4) : sender.address;
        return (
            <div className='popUp'>
                <div className='confirm-transaction'>
                    <div className='title'>
                        <FormattedMessage id='ACCOUNTS.CONFIRM_TRANSACTION' />
                    </div>
                    <div className='popUp__grid'>
                        <div className='popUp__row'>
                            <div>
                                <FormattedMessage id='ACCOUNT.SEND.PAY_ACCOUNT' />
                            </div>
                            <div>
                                <div><b>{senderAddress}</b></div>
                                <small>{selectedToken.amount ? new BigNumber(selectedToken.amount).toFormat() : '--'}&nbsp;{selectedToken.abbr ? selectedToken.abbr : selectedToken.name}</small>
                            </div>
                        </div>
                        <div className='popUp__row'>
                            <div>
                                <FormattedMessage id='ACCOUNT.SEND.RECEIVE_ADDRESS' />
                            </div>
                            <div>
                                <b>{receiverAddress}</b>
                            </div>
                        </div>
                        <div className='popUp__row'>
                            <div>
                                <FormattedMessage id='ACCOUNT.SEND.TRANSFER_AMOUNT' />
                            </div>
                            <div>
                                <b>{`${new BigNumber(amount).toFormat()} ${symbol}`}</b>
                            </div>
                        </div>
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

    onSend() {
        BigNumber.config({ EXPONENTIAL_AT: [-20,30] })
        this.setState({
            loading: true,
            success: false
        });
        const { formatMessage } = this.props.intl;
        const { value: recipient } = this.state.recipient;
        const { value: amount } = this.state.amount;

        const {
            id,
            decimals
        } = this.state.selectedToken;

        let func;
        if(id === 0) {
            func = PopupAPI.sendMcash(
                recipient,
                new BigNumber(amount).shiftedBy(8).toString()
            );
        } else if(typeof id === 'string' && id.match(/^M/)) {
            func = PopupAPI.sendSmartToken(
                recipient,
                new BigNumber(amount).shiftedBy(decimals).toString(),
                id
            );
        } else {
            let tokenId = id;
            if (typeof id === 'string') {
                tokenId = parseInt(id);
            }
            func = PopupAPI.sendBasicToken(
                recipient,
                new BigNumber(amount).shiftedBy(decimals).toString(),
                tokenId
            );
        }

        func.then(() => {
            swal(formatMessage({id:'SEND.SUCCESS'}),'','success');
            this.setState({
                loading: false
            });
        }).catch(error => {
            swal(JSON.stringify(error),'','error');
            this.setState({
                loading: false
            });
        });
    }

    onCancel() {
        const { selected, selectedToken = {} } = this.props.accounts;
        const token10DefaultImg = require('@mcashlight/popup/src/assets/images/new/token_10_default.png');
        if( selected.dealCurrencyPage == 1) {
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
        }else {
            PopupAPI.changeState(APP_STATE.READY);
        }
    }

    render() {
        const { isOpen,selectedToken,loading,amount,recipient, showConfirm } = this.state;
        const {selected, accounts} = this.props.accounts;
        const trx = {tokenId:0,name:"Mcash",balance:selected.balance,abbr:"MCASH",decimals:8,imgUrl:mcashImg};
        let tokens = {...selected.tokens.basic,...selected.tokens.smart};
        tokens = Utils.dataLetterSort(Object.entries(tokens).filter(([tokenId,token])=>typeof token === 'object' ).map(v=>{v[1].tokenId = v[0];return v[1]}),'name');
        tokens = [trx,...tokens];
        return (
            <div className='insetContainer send' onClick={()=>{this.setState({isOpen:{account:false,token:false}})}}>
                {showConfirm ? this.renderConfirmSend() : null}
                <div className='pageHeader'>
                    <div className="back" onClick={(e) => this.onCancel() }></div>
                    <FormattedMessage id="ACCOUNT.SEND"/>
                </div>
                <div className='greyModal'>
                    <div className="input-group">
                        <label><FormattedMessage id="ACCOUNT.SEND.PAY_ACCOUNT"/></label>
                        <div className={"input dropDown"+(isOpen.account?" isOpen":"")} onClick={ (e)=>{e.stopPropagation();isOpen.token =false ;isOpen.account = !isOpen.account; this.setState({isOpen})} }>
                            <div className="selected">{ selected.address }</div>
                            <div className="dropWrap" style={isOpen.account?(Object.entries(accounts).length<=5?{height:48*Object.entries(accounts).length}:{height:180,overflow:'scroll'}):{}}>
                                {
                                    Object.entries(accounts).map(([address])=><div onClick={(e)=>{this.changeAccount(address,e)}} className={"dropItem multiple-line"+(address===selected.address?" selected":"")}><div className={'name'}><small>{accounts[address] ? accounts[address].name : 'Wallet'}:</small></div>{address}</div>)
                                }
                            </div>
                        </div>
                        <div className="otherInfo">
                            <FormattedMessage id="COMMON.BALANCE"/>:&nbsp;
                            {selected.balance/Math.pow(10,CHAIN_DECIMALS)} {CHAIN_SYMBOL}
                        </div>
                    </div>
                    <div className={"input-group"+(recipient.error?' error':'')}>
                        <label><FormattedMessage id="ACCOUNT.SEND.RECEIVE_ADDRESS"/></label>
                        <div className="input">
                            <input type="text" onChange={(e)=>{this.onRecipientChange(e)} }/>
                        </div>
                        <div className="tipError">
                            {recipient.error?<FormattedMessage id={recipient.error} />:null}
                        </div>
                    </div>
                    <div className="input-group">
                        <label><FormattedMessage id="ACCOUNT.SEND.CHOOSE_TOKEN"/></label>
                        <div className={"input dropDown"+(isOpen.token?' isOpen':'')} onClick={ (e)=>{e.stopPropagation();isOpen.account=false;isOpen.token = !isOpen.token; this.setState({isOpen})} }>
                            <div className="selected">
                                <span title={`${selectedToken.name} (${selectedToken.amount})`}>{`${selectedToken.name} (${selectedToken.amount})`}</span>{selectedToken.id !== 0?(<span>id:{selectedToken.id.length===7?selectedToken.id:selectedToken.id.substr(0,6)+'...'+selectedToken.id.substr(-6)}</span>):''}</div>
                            <div className="dropWrap" style={isOpen.token?(tokens.length<=5?{height:36*tokens.length}:{height:180,overflow:'scroll'}):{}}>
                                {
                                    tokens.filter(({balance})=>balance>0).map(({tokenId:id,balance,name,decimals,abbr})=>{
                                        const BN = BigNumber.clone({
                                            DECIMAL_PLACES: decimals,
                                            ROUNDING_MODE: Math.min(8, decimals)
                                        });
                                        const amount = new BN(balance)
                                            .shiftedBy(-decimals)
                                            .toString();
                                        return (
                                            <div onClick={(e)=>{this.changeToken({id,amount,name,decimals,abbr},e)}} className={"dropItem"+(id===selectedToken.id?' selected':'')}><span title={`${name}(${amount})`}>{`${name} (${amount})`}</span>{id!==0&&typeof id === 'string'?(<span>id:{id.length===7?id:id.substr(0,6)+'...'+id.substr(-6)}</span>):''}</div>
                                        )
                                    })
                                }
                            </div>
                        </div>
                    </div>
                    <div className={"input-group hasBottomMargin"+(+amount.value && amount.error?' error':'')}>
                        <label><FormattedMessage id="ACCOUNT.SEND.TRANSFER_AMOUNT"/></label>
                        <div className="input">
                            <input type="text" onChange={ (e)=>{this.onAmountChange(e)} }/>
                        </div>
                        <div className="tipError">
                            {+amount.value && amount.error?(amount.values?<FormattedMessage id={amount.error} values={amount.values} />:<FormattedMessage id={amount.error} />):null}
                        </div>
                    </div>
                    <Button
                        id='ACCOUNT.SEND'
                        isLoading={ loading }
                        isValid={
                            amount.valid &&
                            recipient.valid
                        }
                        renderIcon={() => <span className={'c-icon icon-send'} />}
                        onClick={ ()=>this.onConfirmSend() }
                    />
                </div>
            </div>
        );
    }
}

export default injectIntl(SendController);
