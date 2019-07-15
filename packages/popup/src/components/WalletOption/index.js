import React from 'react';

import { FormattedMessage } from 'react-intl';

import './WalletOption.scss';

const WalletOption = props => {
    const {
        className = '',
        onClick,
        name
    } = props;

    const titleKey = `${ name }.TITLE`;
    const descKey = `${ name }.TIP`;

    return (
        <div
            className={ `walletOption ${ className }`}
            onClick={onClick}
        >
            <FormattedMessage
                id={ titleKey }
                children={(value) => (
                    <span className="title">{value}</span>
                )}
            />
            <div className="tip"><FormattedMessage id={descKey}/></div>
            <div className="iconWrap" />
        </div>
    );
};

export default WalletOption;
