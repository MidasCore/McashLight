import React from 'react';
import { FormattedMessage } from 'react-intl';
import QRCode from 'qrcode-react';
import { BUTTON_TYPE } from '@mcashlight/lib/constants';
import { PopupAPI } from '@mcashlight/lib/api';
import Button from '../../components/Button';

class Backup extends React.Component {
    constructor () {
        super();
        this.state = {
            showQrCodePrivateKey: false,
            verified: false,
            password: {
                value: '',
                isValid: false
            },
            errorPassword: '',
            isVerifying: false
        };
    }

    onClosePopup = () => {
        this.setState({
            verified: false
        }, () => {
            if (this.props.onClose)
                this.props.onClose();
        });
    };

    toggleShowQrCodePrivateKey = () => {
        this.setState(prevState => ({
            showQrCodePrivateKey: !prevState.showQrCodePrivateKey
        }));
    };

    onPasswordChange = (e) => {
        const { value } = e.target;
        this.setState({
            password: {
                isValid: value && !!value.trim().length,
                value
            }
        });
    };

    onVerify = () => {
        const { password } = this.state;
        this.setState({
            isVerifying: true
        });

        PopupAPI
            .verifyPassword(password.value.trim())
            .then(() => {
                this.setState({
                    verified: true
                });
            })
            .catch(error => this.setState({
                errorPassword: error
            }))
            .finally(() => this.setState({
                isVerifying: false
            }));
    };

    renderPasswordVerification = () => {
        const { errorPassword, isVerifying } = this.state;
        return (
            <div className='option'>
                <FormattedMessage id='ACCOUNTS.VERIFY.LABEL'/>
                <div className={`input-group${errorPassword ? ' error' : ''}`}>
                    <div className='input'>
                        <input type='password' autoFocus onChange={ this.onPasswordChange }/>
                    </div>
                    <div className='tipError'>
                        { errorPassword ? <FormattedMessage id={errorPassword} /> : '' }
                    </div>
                </div>

                <div className='security-warning'>
                    <FormattedMessage id='ACCOUNTS.VERIFY.WARNING'/>
                </div>

                <div className='buttonRow'>
                    <Button
                        id='BUTTON.CLOSE'
                        type={ BUTTON_TYPE.DANGER }
                        onClick={ this.onClosePopup }
                        tabIndex={ 1 }
                    />
                    <Button
                        id='BUTTON.CONFIRM'
                        isLoading={ isVerifying }
                        onClick={ this.onVerify }
                        tabIndex={ 1 }
                    />
                </div>
            </div>
        );
    };

    render () {
        const { mnemonic, privateKey } = this.props;
        const { showQrCodePrivateKey, verified } = this.state;

        return (
            <div className='popUp'>
                <div className='backUp'>
                    <div className='title'>
                        <FormattedMessage id='ACCOUNTS.EXPORT' />
                    </div>
                    {
                        verified ? (
                            <React.Fragment>
                                {
                                    mnemonic
                                        ?
                                        <div className='option'>
                                            <FormattedMessage id='ACCOUNTS.EXPORT.MNEMONIC' />
                                            <div className='block'>
                                                {
                                                    mnemonic.split(' ').map((v, i) => <div key={i} className='cell'>{v}</div>)
                                                }
                                            </div>
                                        </div>
                                        :
                                        null
                                }
                                {
                                    privateKey
                                        ?
                                        <div className='option' style={{ marginBottom: 20 }}>
                                            <div className='label'>
                                                <FormattedMessage id='ACCOUNTS.EXPORT.PRIVATE_KEY' />
                                                <span className='btn-qrcode' onClick={this.toggleShowQrCodePrivateKey}/>
                                            </div>
                                            {
                                                showQrCodePrivateKey && (
                                                    <div className='qrcode'>
                                                        <QRCode value={privateKey} size={82} />
                                                    </div>
                                                )
                                            }
                                            <div className='block'>
                                                { privateKey }
                                            </div>
                                        </div>
                                        :
                                        null
                                }
                                <div className='buttonRow'>
                                    <Button
                                        id='BUTTON.CLOSE'
                                        type={ BUTTON_TYPE.DANGER }
                                        onClick={ this.onClosePopup }
                                        tabIndex={ 1 }
                                    />
                                </div>
                            </React.Fragment>
                        ) : this.renderPasswordVerification()
                    }
                </div>
            </div>
        );
    }
}

export default Backup;
