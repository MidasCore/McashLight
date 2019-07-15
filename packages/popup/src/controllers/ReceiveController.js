import React from 'react';
import QRCode from 'qrcode-react';
// import CopyToClipboard from 'react-copy-to-clipboard';
import { Toast } from 'antd-mobile';
import { FormattedMessage, injectIntl } from 'react-intl';
import { PopupAPI } from '@mcashlight/lib/api';
import { APP_STATE } from '@mcashlight/lib/constants';
import CopyTextToClipboard from '@mcashlight/popup/src/components/CopyTextToClipboard';

class ReceiveController extends React.Component {
// const ReceiveController = props => {

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
            PopupAPI.setSelectedToken(selectedCurrency);
            PopupAPI.changeState(APP_STATE.TRANSACTIONS);
            PopupAPI.changeDealCurrencyPage(0);
        }else {
            PopupAPI.changeState(APP_STATE.READY);
        }
    }

    render() {
        const { address } = this.props;
        const { formatMessage } = this.props.intl;
        return (
            <div className='insetContainer receive'>
                <div className='pageHeader'>
                    <div className="back" onClick={() => this.onCancel() } />
                    <FormattedMessage id="ACCOUNT.RECEIVE" />
                </div>
                <div className='greyModal'>
                    <div className="desc">
                        <FormattedMessage id="ACCOUNT.RECEIVE.DESC" />
                    </div>
                    <QRCode
                        value={address}
                    />
                    <div className="address">
                        {address}
                    </div>
                    <div>
                        <input value={address} type='hidden'/>
                        <CopyTextToClipboard
                            text={address}
                            onCopy={text => {
                                console.log('Copy to clipboard: ', text);
                                Toast.info(formatMessage({ id: 'TOAST.COPY' }), 2);
                            }}
                        >
                            <a className="copyAddressBtn">
                                <FormattedMessage id="ACCOUNT.RECEIVE.BUTTON" />
                            </a>
                        </CopyTextToClipboard>
                    </div>
                </div>
            </div>
        );
    }

};

export default injectIntl(ReceiveController);
