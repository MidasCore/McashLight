import React from 'react';
import { connect } from 'react-redux';
import { FormattedMessage, injectIntl } from 'react-intl';

class Ieos extends React.Component {
    render () {
        const { ieos } = this.props;
        if(ieos.length === 0)
            return null;
        const { language } = this.props;
        return (
            <div className='ieos'>
                {
                    ieos.map((v, i) => (
                        <div key={`ieo-${i}`} className='ieo' onClick={() => { window.open(v.ieoUrl); }}>
                            <img src={v.logoUrl} />
                            <div className='name'>{v.name}</div>
                            <div className='worth'>
                                {
                                    v.time + 1 > 0 ? (
                                        <div className='ieo_will'>
                                            {/*<FormattedMessage id='IEOS.LEFT_TIME' values={{day:v.timer[3]}} />*/}
                                            {
                                                language === 'en' ?
                                                    <span>
                                                        {v.timer[ 3 ] > 1 ? `${v.timer[ 3 ] } days until the sale` : (v.timer[ 3 ] === 1 ? '1 day until the sale' : 'until the sale')}
                                                    </span>
                                                    :
                                                    <FormattedMessage id='IEOS.LEFT_TIME' values={{ day: (v.timer[ 3 ] > 0 ? (language === 'zh' ? `${v.timer[ 3 ] }天` : `${v.timer[ 3 ]}日`) : '') }} />
                                            }
                                            <div className='time'>
                                                <div className='cell'>{v.timer[ 0 ]}</div>
                                                :
                                                <div className='cell'>{v.timer[ 1 ]}</div>
                                                :
                                                <div className='cell'>{v.timer[ 2 ]}</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className='ieo_ing'><FormattedMessage id='IEOS.BUY_ING' /></div>
                                    )
                                }
                                <div className='launch'>
                                    <FormattedMessage id='IEOS.LAUNCH_BASE' />
                                </div>
                            </div>
                        </div>
                    ))
                }
            </div>
        );
    }
}

export default injectIntl(
    connect(state => ({
        language: state.app.language
    }))(Ieos)
);
