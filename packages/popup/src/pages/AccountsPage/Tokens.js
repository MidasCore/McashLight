import React from 'react';
import { injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import { PopupAPI } from '@mcashlight/lib/api';
import { APP_STATE } from '@mcashlight/lib/constants';
import Utils from '@mcashlight/lib/utils';

const token10DefaultImg = require('@mcashlight/popup/src/assets/images/new/token_10_default.png');

class Tokens extends React.Component {
    render () {
        const { tokens } = this.props;
        const { prices, accounts } = this.props;
        return (
            <div className='tokens'>
                {
                    tokens.map(({ tokenId, ...token }, index) => {
                        const amount = new BigNumber(token.balance).shiftedBy(-token.decimals).toString();
                        // const price = typeof token.price === 'undefined' ? 0 : token.price;
                        // const money = tokenId === 0 ? (price * amount).toFixed(2) : (price * amount * prices.priceList[ prices.selected ]).toFixed(2);
                        const price = Utils.getTokenPrice(token, prices.selected);
                        const money = Utils.formattedPrice(new BigNumber(amount).multipliedBy(price).toString());
                        return (
                            <div key={`token-${index}`} className='tokenItem' onClick={ () => {
                                const o = {
                                    id: tokenId, name: token.name, abbr: token.abbr || token.symbol,
                                    decimals: token.decimals, amount, price: token.price,
                                    imgUrl: token.imgUrl ? token.imgUrl : token10DefaultImg
                                };
                                if(tokenId === 0) {
                                    o.frozenBalance = new BigNumber(accounts.selected.frozenBalance)
                                        .shiftedBy(-token.decimals)
                                        .toString();
                                    o.balance = new BigNumber(accounts.selected.balance)
                                        .shiftedBy(-token.decimals)
                                        .toString();
                                    o.stakeBalance = new BigNumber(accounts.selected.stakeBalance)
                                        .shiftedBy(-token.decimals)
                                        .toString();
                                }
                                PopupAPI.setSelectedToken(Object.assign({}, token, o));
                                PopupAPI.changeState(APP_STATE.TRANSACTIONS);
                            }}
                            >
                                <img src={token.imgUrl || token10DefaultImg} onError={(e) => { e.target.src = token10DefaultImg; }} alt=''/>
                                <div className='name'>
                                    <span>{token.abbr || token.symbol || token.name}</span>
                                    {/*{*/}
                                    {/*token.isShow ?*/}
                                    {/*<div className='income'>*/}
                                    {/*<FormattedMessage id='USDT.MAIN.INCOME_YESTERDAY' values={{ earning: (token.income > 0 ? '+' : '') + new BigNumber(token.income).toFixed(2).toString() }} />*/}
                                    {/*</div>*/}
                                    {/*: null*/}
                                    {/*}*/}
                                </div>
                                <div className='worth'>
                                    <span>{Utils.numberFormat(amount)}</span>
                                    <span>≈ <span className='light-color'>{price ? money : '--'}</span> {prices.selected}</span>
                                </div>
                            </div>
                        );
                    })
                }
            </div>
        );
    }
}

export default injectIntl(
    connect(state => ({
        accounts: state.accounts,
        prices: state.app.prices
    }))(Tokens)
);
