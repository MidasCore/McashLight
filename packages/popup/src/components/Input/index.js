import React from 'react';

import { injectIntl } from 'react-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { VALIDATION_STATE } from '@mcashlight/lib/constants';

import './Input.scss';

const renderStatus = status => {
    let icon = false;

    if(status === VALIDATION_STATE.VALID)
        icon = 'check-circle';

    if(status === VALIDATION_STATE.INVALID)
        icon = 'times-circle';

    return (
        <div className='inputStatus'>
            { icon ? <FontAwesomeIcon icon={ icon } className={ `stateIcon ${ status }` } /> : '' }
        </div>
    );
};

const onKeyPress = ({ key }, onEnter) => {
    if(key === 'Enter')
        onEnter();
};

class Input extends React.Component {
    _inputRef = null;

    constructor () {
        super();
        this.state = {
            isFocused: false
        };
    }

    // componentDidMount () {
    //     if (this.props.autofocus && this._inputRef && this._inputRef.focus)
    //         this._inputRef.focus();
    // }

    handleChange = value => {
        const { isDisabled = false, validator = false, onChange = () => {} } = this.props;
        if(isDisabled)
            return;

        if(validator && !validator.test(value))
            return;

        onChange(value);
    };

    // handleFocus = () => {
    //     this.setState({
    //         isFocused: true
    //     });
    // };
    //
    // handleBlur = () => {
    //     this.setState({
    //         isFocused: false
    //     });
    // };

    render() {
        const {
            autoFocus = false,
            icon = false,
            status = false,
            isDisabled = false,
            type = 'text',
            value = '',
            className = '',
            onEnter = () => {},
            intl
        } = this.props;

        let { placeholder = '' } = this.props;

        const { isFocused } = this.state;

        if(placeholder)
            placeholder = intl.messages[ placeholder ];

        const inputClasses = [ ];

        if(icon)
            inputClasses.push('has-icon');

        if(status)
            inputClasses.push('has-status');

        if(isDisabled)
            inputClasses.push('is-disabled');

        return (
            <div className={ `customInput ${ className } ${ isFocused ? 'focused' : '' }` }>
                { icon ? <FontAwesomeIcon icon={ icon } className='inputIcon' /> : '' }
                <input
                    ref={ input => this._inputRef = input }
                    autoFocus={ autoFocus }
                    className={ inputClasses.join(' ') }
                    placeholder={ placeholder }
                    type={ type }
                    value={ value }
                    onChange={ ({ target: { value } }) => this.handleChange(value) }
                    onKeyPress={ event => !isDisabled && onKeyPress(event, onEnter) }
                    // onFocus={ () => this.handleFocus() }
                    // onBlur={ () => this.handleBlur() }
                    readOnly={ isDisabled }
                />
                { status ? renderStatus(status) : '' }
            </div>

        );
    }
}

export default injectIntl(Input);
