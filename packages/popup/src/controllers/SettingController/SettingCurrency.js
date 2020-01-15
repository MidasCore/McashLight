import React from 'react';
import { FormattedMessage } from 'react-intl';
import { BigNumber } from 'bignumber.js';
import { PopupAPI } from '@mcashlight/lib/api';

export default class SettingCurrency extends React.Component {
    formatCurrencyValue = (value) => {
        if (!value)
            return value;

        const v = new BigNumber(value);
        if (v.lt(new BigNumber(1e-10)))
            return v;

        return v.toFixed();
    };

    render () {
        const { prices } = this.props;
        return (
            <div className='txt'>
                <div className='span'>
                    <FormattedMessage id='SETTING.TITLE.CURRENCY' />
                    <div className='unit'>{prices.selected}</div>
                </div>
                <div className='settingWrap'>
                    {
                        Object.entries(prices.priceList).map(([key, val]) => (
                            <div
                                key={key}
                                onClick={(e) => { e.stopPropagation();PopupAPI.selectCurrency(key); }}
                                className={`unit${key === prices.selected ? ' selected' : ''}`}
                            >{`${key} (${this.formatCurrencyValue(val)})`}
                            </div>
                        ))
                    }
                </div>
            </div>
        );
    }
}
