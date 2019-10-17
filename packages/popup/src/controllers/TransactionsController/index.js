import React from 'react';
import moment from 'moment';
// import CopyToClipboard from 'react-copy-to-clipboard';
import { Toast } from 'antd-mobile';
import { BigNumber } from 'bignumber.js';
import { FormattedMessage, injectIntl } from 'react-intl';
import { PopupAPI } from '@mcashlight/lib/api';
import { APP_STATE } from '@mcashlight/lib/constants';
import CopyTextToClipboard from '@mcashlight/popup/src/components/CopyTextToClipboard';
import { MCASHSCAN_URL } from '../../config/constants';

BigNumber.config({ EXPONENTIAL_AT: [-20, 30] });
const token10DefaultImg = require('@mcashlight/popup/src/assets/images/new/token_10_default.png');

class TransactionsController extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            index: 0,
            isTop: false,
            transactions: {
                records: [],
                total: 0
            },
            isRequest: false,
            currentPage: 1
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

    render() {
        const { index, isTop, transactions, isRequest, currentPage } = this.state;
        const {
            accounts,
            onCancel,
            prices
        } = this.props;
        const { formatMessage } = this.props.intl;
        const { address } = accounts.selected;
        const { id = 0, name = 'MCASH', decimals = 8, imgUrl, price = 0, amount, balance, frozenBalance, stakeBalance } = accounts.selectedToken;
        return (
            <div className='insetContainer transactions'>
                <div className='pageHeader'>
                    <div className='back' onClick={onCancel}></div>
                    <span className='title'>{name}</span>
                    {
                        id !== 0 ?
                            <span className='detail' onClick={() => {
                                let url = 'https://mcashscan.io/#/';
                                url += (typeof id === 'string' && id.match(/^M/) ? `token20/${id}` : `token/${id}`);
                                window.open(url);
                            }}
                            >
                                <FormattedMessage id='TRANSACTION.TOKEN_INFO.DETAIL' />
                            </span>
                            : null
                    }

                </div>
                <div className='greyModal'>
                    <div className='showTokenInfo' style={ isTop ? { height: 0, paddingTop: 0, overflow: 'hidden' } : { overflow: 'hidden', height: (id === 0 ? 216 : 176) }}>
                        <img src={imgUrl || token10DefaultImg} onError={(e) => { e.target.src = token10DefaultImg; }} />
                        <div className='amount'>
                            {amount}
                        </div>
                        <div className='worth'>
                            ≈ { price ? (id === 0 ? (price * amount).toFixed(2) : (price * amount * prices.priceList[ prices.selected ]).toFixed(2)) : '--'} {prices.selected}
                        </div>
                        {
                            id === 0 ?
                                <div className='desc trx'>
                                    <div className='cell'>
                                        <div className='row1'>
                                            {balance}
                                        </div>
                                        <div className='row2'>
                                            <FormattedMessage id='TRANSACTION.TOKEN_INFO.AVAILABLE_BALANCE' />
                                        </div>
                                    </div>
                                    <div className='cell'>
                                        <div className='row1'>
                                            {frozenBalance}
                                        </div>
                                        <div className='row2'>
                                            <FormattedMessage id='TRANSACTION.TOKEN_INFO.FROZEN_BALANCE' />
                                        </div>
                                    </div>
                                    <div className='cell'>
                                        <div className='row1'>
                                            {stakeBalance}
                                        </div>
                                        <div className='row2'>
                                            <FormattedMessage id='TRANSACTION.TOKEN_INFO.STAKE_BALANCE' />
                                        </div>
                                    </div>
                                </div>
                                :
                                (
                                    typeof id === 'string' && id.match(/^M/)
                                        ?
                                        (
                                            <div className='desc token'>
                                                <FormattedMessage id='TRANSACTION.TOKEN_INFO.CONTRACT' />:&nbsp;
                                                {`${id.substr(0, 7)}...${id.substr(-7)}`}
                                                <input value={id} type='hidden'/>
                                                <CopyTextToClipboard
                                                    text={id}
                                                    onCopy={text => {
                                                        console.log('Copy to clipboard: ', text);
                                                        Toast.info(formatMessage({ id: 'TOAST.COPY' }));
                                                    }}
                                                >
                                                    <span className='copy'/>
                                                </CopyTextToClipboard>
                                            </div>
                                        )
                                        :
                                        <div className='desc token'>ID:&nbsp;{id}</div>
                                )

                        }

                    </div>
                    <div className='tabNav'>
                        <div className={index == 0 ? 'active' : '' } onClick={async () => {
                            this.setState({ index: 0 });
                            Toast.loading('', 0);
                            const transactions = await PopupAPI.getTransactionsByTokenId({ tokenId: id, start: 0, direction: 'all' });
                            Toast.hide();
                            this.setState({ transactions, currentPage: 1, isRequest: false });
                        }}
                        >
                            <FormattedMessage id='ACCOUNT.ALL'/>
                        </div>
                        <div className={ index == 2 ? 'active' : '' } onClick={async () => {
                            this.setState({ index: 2 });
                            Toast.loading('', 0);
                            const transactions = await PopupAPI.getTransactionsByTokenId({ tokenId: id, start: 0, direction: 'from', type: 'Transfer' });
                            Toast.hide();
                            this.setState({ transactions, currentPage: 1, isRequest: false });
                        }}
                        >
                            <FormattedMessage id='ACCOUNT.RECEIVE' />
                        </div>
                        <div className={index == 1 ? 'active' : ''} onClick={async () => {
                            this.setState({ index: 1 }) ;
                            Toast.loading('', 0);
                            const transactions = await PopupAPI.getTransactionsByTokenId({ tokenId: id, start: 0, direction: 'to', type: 'Transfer' });
                            Toast.hide();
                            this.setState({ transactions, currentPage: 1, isRequest: false });
                        }}
                        >
                            <FormattedMessage id='ACCOUNT.SEND' />
                        </div>
                    </div>
                    <div className='transaction scroll' onScroll={async(e) => {
                        const key = index === 0 ? 'all' : ( index === 1 ? 'to' : 'from');
                        if(transactions.records.length > 8) {
                            const isTop = !(e.target.scrollTop === 0);
                            this.setState({ isTop });
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
                                        console.log('0%', records.records);
                                        console.log('0%', transactions);
                                        transactions.records = transactions.records.concat(records.records);
                                        this.setState({ transactions, currentPage: page, isRequest: false });
                                    }
                                }
                            }
                        }
                    }}
                    >
                        {
                            transactions.records.length > 0 ?
                                <div className='lists'>
                                    {
                                        transactions.records.map((v, transIndex) => {
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
                                            return (
                                                <div
                                                    className={`item ${direction}`} key={transIndex}
                                                    onClick={(e) => { e.stopPropagation();window.open(`${MCASHSCAN_URL}/transaction/${hash}`); }}
                                                >
                                                    <div className='left'>
                                                        <div className='address'>{shortAddr}</div>
                                                        <div className='time'>{moment(v.timestamp).format('YYYY-MM-DD HH:mm:ss')}</div>
                                                    </div>
                                                    <div className='right'>
                                                        {new BigNumber(callValue).shiftedBy(-decimals).toString()}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    }
                                </div>
                                :
                                <div className='noData'>
                                    <FormattedMessage id='TRANSACTIONS.NO_DATA' />
                                </div>
                        }
                    </div>
                </div>
                <div className='buttonGroup'>
                    <button className='receive' onClick={ (e) => {
                        PopupAPI.changeDealCurrencyPage(1);
                        PopupAPI.changeState(APP_STATE.RECEIVE);
                    }}
                    >
                        <FormattedMessage id='ACCOUNT.RECEIVE'/>
                    </button>
                    <button className='send' onClick={ (e) => {
                        PopupAPI.changeDealCurrencyPage(1);
                        PopupAPI.changeState(APP_STATE.SEND);
                    }}
                    >
                        <FormattedMessage id='ACCOUNT.SEND'/>
                    </button>
                </div>
            </div>
        );
    }
}

export default injectIntl(TransactionsController);
