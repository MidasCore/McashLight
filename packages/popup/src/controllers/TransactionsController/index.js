import React from 'react';
import { connect } from 'react-redux';
// import CopyToClipboard from 'react-copy-to-clipboard';
import { Toast } from 'antd-mobile';
import { BigNumber } from 'bignumber.js';
import { FormattedMessage, injectIntl } from 'react-intl';
import { PopupAPI } from '@mcashlight/lib/api';
import { APP_STATE } from '@mcashlight/lib/constants';
import Utils from '@mcashlight/lib/utils';
import CopyTextToClipboard from '@mcashlight/popup/src/components/CopyTextToClipboard';
import { setInputDefault } from '@mcashlight/popup/src/reducers/sendingReducer';
import TransactionList from './TransactionList';
import { MCASHSCAN_URL } from '../../config/constants';

BigNumber.config({ EXPONENTIAL_AT: [-20, 30] });
const token10DefaultImg = require('@mcashlight/popup/src/assets/images/new/token_10_default.png');

class TransactionsController extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            isTop: false
        };
    }

    handleChangeIsTop = (value) => {
        this.setState({ isTop: value });
    };

    openSend = (inputDefault) => {
        PopupAPI.changeDealCurrencyPage(1);
        PopupAPI.changeState(APP_STATE.SEND);
        this.props.setInputDefault(inputDefault);
    };

    render() {
        const { isTop } = this.state;
        const { accounts, onCancel, prices, nodes } = this.props;
        const currentNode = (nodes && nodes.nodes && nodes.nodes[ nodes.selected ]) || {};
        const { formatMessage } = this.props.intl;
        const { id = 0, name = 'MCASH', imgUrl, amount, balance, frozenBalance, stakeBalance } = accounts.selectedToken;
        const price = Utils.getTokenPrice(accounts.selectedToken, prices.selected);
        const money = Utils.formattedPrice(new BigNumber(amount).multipliedBy(price).toString());
        return (
            <div className='insetContainer transactions'>
                <div className='pageHeader'>
                    <div className='back' onClick={onCancel} />
                    <span className='title'>{name}</span>
                    {
                        id !== 0 ?
                            <span className='detail' onClick={() => {
                                let url = currentNode.mcashScanExplorer || MCASHSCAN_URL;
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
                        <img src={imgUrl || token10DefaultImg} onError={(e) => { e.target.src = token10DefaultImg; }} alt={''} />
                        <div className='amount'>
                            {Utils.numberFormat(amount)}
                        </div>
                        <div className='worth'>
                            ≈ { price ? money : '--'} {prices.selected}
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
                    <TransactionList
                        accounts={accounts}
                        currentNode={currentNode}
                        onChangeIsTop={this.handleChangeIsTop}
                        onSendTo={this.openSend}
                    />
                </div>
                <div className='buttonGroup'>
                    <button className='receive' onClick={ () => {
                        PopupAPI.changeDealCurrencyPage(1);
                        PopupAPI.changeState(APP_STATE.RECEIVE);
                    }}
                    >
                        <FormattedMessage id='ACCOUNT.RECEIVE'/>
                    </button>
                    <button className='send' onClick={this.openSend}>
                        <FormattedMessage id='ACCOUNT.SEND'/>
                    </button>
                </div>
            </div>
        );
    }
}

export default connect(null, {
    setInputDefault
})(injectIntl(TransactionsController));
