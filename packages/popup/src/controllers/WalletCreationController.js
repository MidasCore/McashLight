import React from 'react';
import WalletOption from '@mcashlight/popup/src/components/WalletOption';

// import { FormattedMessage } from 'react-intl';
import { APP_STATE } from '@mcashlight/lib/constants';
import { PopupAPI } from '@mcashlight/lib/api';
import logo from '@mcashlight/popup/src/assets/images/logo-full-white.svg';

const onCreationSelect = () => PopupAPI.changeState(APP_STATE.CREATING);
const onRestoreSelect = () => PopupAPI.changeState(APP_STATE.RESTORING);

const WalletCreationController = () => (
    <div className='insetContainer createOrImportWallet'>
        <div className='customHeader'>
            <img src={logo} />
        </div>
        <div className='greyModal'>
            <div className="walletOptions">
                <WalletOption tabIndex={ 1 } name='CREATION.CREATE' onClick={ onCreationSelect } />
                <WalletOption tabIndex={ 2 } name='CREATION.RESTORE' onClick={ onRestoreSelect } />
            </div>
        </div>
    </div>
);

export default WalletCreationController;
