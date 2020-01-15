import React from 'react';
import { BUTTON_TYPE } from '@mcashlight/lib/constants';
import Button from '../Button';
import './CConfirmModal.scss';

class CConfirmModal extends React.Component {
    render () {
        const {
            visible = false, title, message, contentClassName = '',
            onCancel = () => {},
            onOk = () => {}
        } = this.props;
        if (!visible) return null;

        return (
            <div className='c-confirm-modal-mask'>
                <div className={`c-confirm-modal${contentClassName ? ` ${contentClassName}` : ''}`}>
                    <div className='c-confirm-modal__header'>
                        {title}
                    </div>
                    <div className='c-confirm-modal__body'>
                        {message}
                    </div>
                    <div className='c-confirm-modal__actions'>
                        <Button
                            id='BUTTON.CANCEL'
                            type={ BUTTON_TYPE.DANGER }
                            onClick={onCancel}
                            tabIndex={ 1 }
                        />
                        <Button
                            id='BUTTON.CONFIRM'
                            onClick={onOk}
                            tabIndex={ 1 }
                        />
                    </div>
                </div>
            </div>
        );
    }
}

export default CConfirmModal;
