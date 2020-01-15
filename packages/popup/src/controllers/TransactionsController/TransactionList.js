import React from 'react';
import moment from 'moment';
import { BigNumber } from 'bignumber.js';
import { FormattedMessage, injectIntl } from 'react-intl';
import { Toast } from 'antd-mobile';
import { MCASHSCAN_URL } from '../../config/constants';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import CTooltip from '../../components/CTooltip';
import { PopupAPI } from '@mcashlight/lib/api';
import './TransactionList.scss';

class TransactionList extends React.Component {
    cellRef = null;

    constructor(props) {
        super(props);
        this.state = {
            index: 0,
            // isTop: false,
            transactions: {
                records: [],
                total: 0
            },
            isRequest: false,
            currentPage: 1,
            copiedField: ''
        };
    }

    async componentDidMount() {
        const {
            accounts
        } = this.props;
        const { id = 0 } = accounts.selectedToken;
        Toast.loading('', 0);
        const transactions = await PopupAPI.getTransactionsByTokenId({ tokenId: id })
            .finally(() => {
                Toast.hide();
            });
        this.setState({ transactions });
    }

    clickChangeTabs = (index) => {
        if (index !== this.state.index) {
            this.setState({ index });
            this.resetExpands();
        }
    };

    getTrxs = async (params) => {
        Toast.loading('', 0);
        const transactions = await PopupAPI.getTransactionsByTokenId(params);
        Toast.hide();
        this.setState({ transactions, currentPage: 1, isRequest: false });
    };

    handleScroll = async (e) => {
        const { index, transactions, isRequest, currentPage } = this.state;
        const { accounts } = this.props;
        const { id = 0 } = accounts.selectedToken;
        const key = index === 0 ? 'all' : ( index === 1 ? 'to' : 'from');
        if(transactions && Array.isArray(transactions.records) && transactions.records.length > 8) {
            const isTop = !(e.target.scrollTop === 0);
            // this.setState({ isTop });
            if (this.props.onChangeIsTop)
                this.props.onChangeIsTop(isTop);
            if(e.target.scrollTop === (((58 * transactions.records.length) + 36) - 484)) {
                if(!isRequest) {
                    this.setState({ isRequest: true });
                    const page = currentPage + 1;
                    Toast.loading('', 0);
                    const records = await PopupAPI.getTransactionsByTokenId({ tokenId: id, start: page - 1, direction: key });
                    Toast.hide();
                    if(records.records.length === 0)
                        this.setState({ isRequest: true });
                    else{
                        transactions.records = transactions.records.concat(records.records);
                        this.setState({ transactions, currentPage: page, isRequest: false });
                    }
                }
            }
        }
    };

    resetExpands = () => {
        if (!this.cellRef)
            return;
        const options = this.cellRef.getElementsByClassName('item');
        for(let i = 0; i < options.length; i++) {
            if (options && options[ i ])
                options[ 0 ].classList.remove('active');
        }
    };

    toggleExpand = (index) => {
        if (!this.cellRef)
            return;
        const options = this.cellRef.getElementsByClassName('item');
        if (options && options[ index ])
            options[ index ].classList.toggle('active');
    };

    clickSendTo = (addr) => {
        if (this.props.onSendTo)
            this.props.onSendTo({ recipient: addr });
    };

    cleanCopiedField = () => {
        if (this.state.copiedField)
            this.setState({ copiedField: '' });
    };

    renderTransactionItem = (v, index) => {
        if (!v) return null;
        const { copiedField } = this.state;
        const { accounts, currentNode } = this.props;
        const { formatMessage } = this.props.intl;
        const { address } = accounts.selected || {};
        const { decimals = 8, name: selectedTokenName } = accounts.selectedToken || {};
        const tokenSymbol = (v.token && v.token.symbol) || selectedTokenName;
        let callValue = 0;
        let direction;
        let addr;
        let hash;
        if(typeof v.asset_id !== 'undefined') {
            callValue = v.amount;
            direction = v.to_address && v.owner_address ? (v.to_address === v.owner_address ? '' : (v.to_address === address ? 'receive' : 'send')) : '';
            // addr = v.toAddress; //trigger => ownerAddress show toAddress
            addr = v.to_address === address ? v.owner_address : v.to_address; //trigger => ownerAddress show toAddress
            hash = v.hash;
        }else{
            direction = v.to_address && v.from_address ? (v.to_address === v.from_address ? '' : (v.to_address === address ? 'receive' : 'send')) : '';
            addr = v.to_address === address ? v.from_address : v.to_address;
            callValue = v.amount;
            hash = v.transaction_hash;
        }
        if (!addr)
            addr = '';

        const shortAddr = addr ? `${addr.substr(0, 4)}...${addr.substr(-12)}` : (v.contract_type || '');
        const from = v.from_address || v.owner_address || '';
        const to = v.to_address || '';
        const amountValue = new BigNumber(callValue).shiftedBy(-decimals);
        const memo = v.contract_data && v.contract_data.memo;
        const mcashScanExplorer = currentNode.mcashScanExplorer || MCASHSCAN_URL;

        return (
            <div key={index} className='item'>
                <div
                    className={`item__header ${direction}`}
                    onClick={() => this.toggleExpand(index)}
                >
                    <div className='left'>
                        <div className='address'>{shortAddr}</div>
                        <div className='time'>{moment(v.timestamp).format('YYYY-MM-DD HH:mm:ss')}</div>
                    </div>
                    <div className='right'>{amountValue.toString()}</div>
                </div>
                <div className='item__content'>
                    <div className='item__content-nav'>
                        <div>Details</div>
                        <div className='actions'>
                            {
                                addr && direction ? (
                                    <CTooltip
                                        id={`resend${index}`}
                                        placement={'left'}
                                        title={formatMessage({ id: 'TIP.SEND_TOKEN_TO' }, { token: tokenSymbol || 'tokens', address: `${addr.substr(0, 4)}...` })}
                                    >
                                        <span className='btn-resend' onClick={() => this.clickSendTo(addr)} />
                                    </CTooltip>
                                ) : null
                            }
                            <CTooltip
                                id={`copyTrxId${index}`}
                                placement={'left'}
                                title={formatMessage({ id: copiedField === 'copyTrxId' ? 'TIP.COPIED_TRANSACTION_ID' : 'TIP.COPY_TRANSACTION_ID' })}
                            >
                                <CopyTextToClipboard text={hash} onCopy={() => this.setState({ copiedField: 'copyTrxId' })}>
                                    <span className='btn-copy' onMouseLeave={this.cleanCopiedField} />
                                </CopyTextToClipboard>
                            </CTooltip>
                            <CTooltip
                                id={`viewOnExplorer${index}`}
                                placement={'left'}
                                title={formatMessage({ id: 'TIP.VIEW_ON_EXPLORER' })}
                            >
                                <a href={`${mcashScanExplorer}/transaction/${hash}`} rel='noopener noreferrer' target={'_blank'} className='btn-open'>
                                    <span />
                                </a>
                            </CTooltip>
                        </div>
                    </div>
                    <div className='item__content-details'>
                        <div className='item__content-addresses'>
                            <CTooltip
                                id={`copyFromAddress${index}`}
                                placement={'bottom'}
                                title={formatMessage({ id: copiedField === 'copyFromAddress' ? 'TIP.COPIED_ADDRESS' : 'TIP.COPY_ADDRESS' })}
                            >
                                <div className={'from'}>
                                    <CopyTextToClipboard text={from} onCopy={() => this.setState({ copiedField: 'copyFromAddress' })}>
                                        <small onMouseLeave={this.cleanCopiedField}>From: {from || '__'}</small>
                                    </CopyTextToClipboard>
                                </div>
                            </CTooltip>
                            <div className={'arrow'}>
                                <span className='icon-chevron-right' />
                            </div>
                            <CTooltip
                                id={`copyToAddress${index}`}
                                placement={'bottom'}
                                title={formatMessage({ id: copiedField === 'copyToAddress' ? 'TIP.COPIED_ADDRESS' : 'TIP.COPY_ADDRESS' })}
                            >
                                <div className={'to'}>
                                    <CopyTextToClipboard text={to} onCopy={() => this.setState({ copiedField: 'copyToAddress' })}>
                                        <small onMouseLeave={this.cleanCopiedField}>To: {to || '__'}</small>
                                    </CopyTextToClipboard>
                                </div>
                            </CTooltip>
                        </div>

                        <div className='item__content-trx'>
                            {/*<div className='trx-list__header'>*/}
                            {/*<FormattedMessage id={'TRANSACTION'} />*/}
                            {/*</div>*/}
                            <div className='trx-list__body'>
                                <div className='trx-list__line'>
                                    <div className='trx-list__line-content'>
                                        <FormattedMessage id={'TRANSACTION.AMOUNT'} />
                                    </div>
                                    <div className='trx-list__line-extra'>
                                        <span>{`${amountValue.toFormat()} ${tokenSymbol || '[]'}`}</span>
                                    </div>
                                </div>
                                {
                                    memo ? (
                                        <div className='trx-list__line'>
                                            <div className='trx-list__line-content'>
                                                <FormattedMessage id={'TRANSACTION.MEMO'} />
                                            </div>
                                            <div className='trx-list__line-extra'>
                                                <span>{memo}</span>
                                            </div>
                                        </div>
                                    ) : null
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    renderTransactions = () => {
        const { transactions } = this.state;
        if (!transactions || !Array.isArray(transactions.records) || transactions.records.length <= 0) {
            return (
                <div className='noData'>
                    <FormattedMessage id='TRANSACTIONS.NO_DATA' />
                </div>
            );
        }
        return (
            <div className='lists' ref={ ref => this.cellRef = ref }>
                {
                    transactions.records.map((v, transIndex) => {
                        return this.renderTransactionItem(v, transIndex);
                    })
                }
            </div>
        );
    };

    render () {
        const { index } = this.state;
        const { accounts } = this.props;
        const { id = 0 } = accounts.selectedToken || {};
        return (
            <React.Fragment>
                <div className='tabNav'>
                    <div className={index === 0 ? 'active' : '' } onClick={() => {
                        this.clickChangeTabs(0);
                        this.getTrxs({ tokenId: id, start: 0, direction: 'all' });
                    }}
                    >
                        <FormattedMessage id='ACCOUNT.ALL'/>
                    </div>
                    <div className={ index === 2 ? 'active' : '' } onClick={() => {
                        this.clickChangeTabs(2);
                        this.getTrxs({ tokenId: id, start: 0, direction: 'from', type: 'Transfer' });
                    }}
                    >
                        <FormattedMessage id='ACCOUNT.RECEIVE' />
                    </div>
                    <div className={index === 1 ? 'active' : ''} onClick={() => {
                        this.clickChangeTabs(1);
                        this.getTrxs({ tokenId: id, start: 0, direction: 'to', type: 'Transfer' });
                    }}
                    >
                        <FormattedMessage id='ACCOUNT.SEND' />
                    </div>
                </div>
                <div className='transaction scroll' onScroll={this.handleScroll}>
                    {this.renderTransactions()}
                </div>
            </React.Fragment>
        );
    }
}

export default injectIntl(TransactionList);
