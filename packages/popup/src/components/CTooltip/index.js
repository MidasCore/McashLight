import React from 'react';
import ReactTooltip from 'react-tooltip';
import './CTooltip.scss';

export default function CTooltip ({ children, id, title = '', placement = 'bottom', type = 'dark', effect = 'solid' }) {
    const child = React.isValidElement(children) ? children : <span>{children}</span>;
    const tip = typeof title === 'string' ? title : '';

    return (
        <React.Fragment>
            {React.cloneElement(child, { 'data-for': id, 'data-tip': '' })}
            <ReactTooltip
                id={id} place={placement} type={type} effect={effect}
                className={'c-tooltip'}
                getContent={() => tip}
            />
        </React.Fragment>
    );
}
