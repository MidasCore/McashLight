import React from 'react';
import Button from '@mcashlight/popup/src/components/Button';
import McashWeb from 'mcashweb';

import { connect } from 'react-redux';
import { FormattedMessage, injectIntl } from 'react-intl';
import { PopupAPI } from '@mcashlight/lib/api';

import './PrivateKeyImport.scss';

const onKeyPress = ({ key }, onEnter) => {
    if(key && key.toLowerCase() === 'enter')
        onEnter();
};

class PrivateKeyImport extends React.Component {
    state = {
        privateKey: '',
        isValid: false,
        error: ''
    };

    constructor() {
        super();

        this.onChange = this.onChange.bind(this);
        this.onSubmit = this.onSubmit.bind(this);
    }

    onChange({ target: { value } }) {
        const { accounts } = this.props;
        const address = McashWeb.address.fromPrivateKey(value);
        let isValid = false;
        let error = '';
        if(address) {
            isValid = true;
            error = '';
        }else{
            isValid = false;
            error = 'EXCEPTION.FORMAT_ERROR';
        }
        if(address in accounts) {
            isValid = false;
            error = 'EXCEPTION.ACCOUNT_EXIST';
        }
        if(value === '')error = '';
        this.setState({
            privateKey: value.trim(),
            isValid,
            error
        });
    }

    onSubmit = () => {
        const { isValid } = this.state;
        if (!isValid) return;
        const { privateKey } = this.state;
        const { name } = this.props;

        PopupAPI.importAccount(
            privateKey,
            name
        );

        PopupAPI.resetState();
    };

    render() {
        const { onCancel } = this.props;
        const { formatMessage } = this.props.intl;

        const {
            privateKey,
            isValid,
            error
        } = this.state;

        return (
            <div className='insetContainer privateKeyImport'>
                <div className='pageHeader'>
                    <div className='back' onClick={ onCancel } />
                    <FormattedMessage id='CREATION.RESTORE.PRIVATE_KEY.TITLE' />
                </div>
                <div className={`greyModal${!isValid && error ? ' error' : ''}`}>
                    <div className='modalDesc hasBottomMargin'>
                        <FormattedMessage id='PRIVATE_KEY_IMPORT.DESC' />
                    </div>
                    <div className='inputUnit'>
                        <textarea
                            autoFocus
                            placeholder={formatMessage({ id: 'PRIVATE_KEY_IMPORT.PLACEHOLDER' })}
                            className='privateKeyInput'
                            rows={ 5 }
                            value={ privateKey }
                            onChange={ this.onChange }
                            tabIndex={ 1 }
                            onKeyPress={ event => onKeyPress(event, this.onSubmit) }
                        />
                        {!isValid ? <div className='tipError'>{error ? <FormattedMessage id={error} /> : null}</div> : null}
                    </div>

                    <div className='buttonRow'>
                        <Button
                            id='BUTTON.CONTINUE'
                            isValid={ isValid }
                            onClick={ this.onSubmit }
                            tabIndex={ 2 }
                        />
                    </div>
                </div>
            </div>
        );
    }
}

export default injectIntl(connect(state => ({
    accounts: state.accounts.accounts
}))(PrivateKeyImport));
