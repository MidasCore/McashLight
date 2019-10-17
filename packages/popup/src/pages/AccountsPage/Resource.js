import React from 'react';
// import { PopupAPI } from '@mcashlight/lib/api';
import ProcessBar from '@mcashlight/popup/src/components/ProcessBar';
import { connect } from 'react-redux';
// import { APP_STATE } from '@mcashlight/lib/constants';
import { FormattedMessage, injectIntl } from 'react-intl';
// import { BANKER_NODE } from '../../config/constants';

class Resource extends React.Component {
    render () {
        // const { nodes, account } = this.props;
        const { account } = this.props;
        return (
            account ?
                <div className='resource'>
                    <div className='cell'>
                        <div className='title'>
                            <FormattedMessage id='CONFIRMATIONS.RESOURCE.BANDWIDTH' />
                            <div className='num' title={`${account.netLimit - account.netUsed}/${account.netLimit}`}>
                                {account.netLimit - account.netUsed}<span>/{account.netLimit}</span>
                            </div>
                        </div>
                        <ProcessBar percentage={(account.netLimit - account.netUsed) / account.netLimit} />
                    </div>
                    <div className='line'></div>
                    <div className='cell bankSingle'>
                        <div className='title'>
                            {/*{*/}
                            {/*nodes.selected === BANKER_NODE ?*/}
                            {/*// nodes.selected === 'f0b1e38e-7bee-485e-9d3f-69410bf306812' ?*/}
                            {/*<span className='bankBox' onClick={ () => { PopupAPI.changeState(APP_STATE.TRONBANK); }}>*/}
                            {/*<FormattedMessage*/}
                            {/*id='CONFIRMATIONS.RESOURCE.ENERGY'*/}
                            {/*children={ value => (*/}
                            {/*<span className='light-color'>{value}</span>*/}
                            {/*) }*/}
                            {/*/>*/}
                            {/*<img className='bankArrow' src={require('../../assets/images/new/tronBank/rightArrow.svg')} alt='arrow'/>*/}
                            {/*<div className='bankPopover'>*/}
                            {/*<div className='popoverTitle'><FormattedMessage id='BANK.INDEX.ENTRANCE' /></div>*/}
                            {/*</div>*/}
                            {/*</span> :*/}
                            {/*<FormattedMessage*/}
                            {/*id='CONFIRMATIONS.RESOURCE.ENERGY'*/}
                            {/*children={ value => (*/}
                            {/*<span className='light-color'>{value}</span>*/}
                            {/*) }*/}
                            {/*/>*/}
                            {/*}*/}
                            <div className='num' title={`${account.energy - account.energyUsed}/${account.energy}`}>
                                {account.energy - account.energyUsed}<span>/{account.energy}</span>
                            </div>
                        </div>
                        <ProcessBar percentage={(account.energy - account.energyUsed) / account.energy} />
                    </div>
                </div>
                :
                null
        );
    }
}

export default injectIntl(
    connect(state => ({
        nodes: state.app.nodes
    }))(Resource)
);
