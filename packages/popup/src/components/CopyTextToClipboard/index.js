import React from 'react';
import PropTypes from 'prop-types';

const copyTextToClipboard = (text) => {
    //Create a textbox field where we can insert text to.
    const copyFrom = document.createElement('textarea');

    //Set the text content to be the text you wished to copy.
    copyFrom.textContent = text;

    copyFrom.setAttribute('readonly', '');
    copyFrom.style.position = 'absolute';
    copyFrom.style.left = '-9999px';

    //Append the textbox field into the body as a child.
    //"execCommand()" only works when there exists selected text, and the text is inside
    //document.body (meaning the text is part of a valid rendered HTML element).
    document.body.appendChild(copyFrom);

    //Select all the text!
    if (navigator.userAgent.match(/ipad|ipod|iphone/i)) {
        // save current contentEditable/readOnly status
        const editable = copyFrom.contentEditable;
        const readOnly = copyFrom.readOnly;

        // convert to editable with readonly to stop iOS keyboard opening
        copyFrom.contentEditable = true;
        copyFrom.readOnly = true;

        // create a selectable range
        const range = document.createRange();
        range.selectNodeContents(copyFrom);

        // select the range
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        copyFrom.setSelectionRange(0, 999999);

        // restore contentEditable/readOnly to original state
        copyFrom.contentEditable = editable;
        copyFrom.readOnly = readOnly;
    } else {
        //
        copyFrom.select();
    }

    //Execute command
    document.execCommand('copy');

    //(Optional) De-select the text using blur().
    copyFrom.blur();

    //Remove the textbox field from the document.body, so no other JavaScript nor
    //other elements can get access to this.
    document.body.removeChild(copyFrom);
};

export default class CopyTextToClipboard extends React.PureComponent {
    static propTypes = {
        text: PropTypes.string.isRequired,
        children: PropTypes.element.isRequired,
        onCopy: PropTypes.func,
        options: PropTypes.shape({
            debug: PropTypes.bool,
            message: PropTypes.string
        })
    };

    static defaultProps = {
        onCopy: undefined,
        options: undefined
    };

    onClick = event => {
        const {
            text,
            onCopy,
            children,
            // options
        } = this.props;

        if (text) {
            try {
                copyTextToClipboard(text);
                if (onCopy)
                    onCopy(text, true);
            } catch (e) {
                console.error(e);
            }
        }

        const elem = React.Children.only(children);

        // const result = copy(text, options);
        //
        // if (onCopy) {
        //     onCopy(text, result);
        // }

        // Bypass onClick if it was present
        if (elem && elem.props && typeof elem.props.onClick === 'function')
            elem.props.onClick(event);
    };

    render() {
        const {
            children,
            ...props
        } = this.props;
        const elem = React.Children.only(children);

        return React.cloneElement(elem, { ...props, onClick: this.onClick });
    }
}
