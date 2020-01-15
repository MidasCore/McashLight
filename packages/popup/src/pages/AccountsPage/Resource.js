import React from 'react';
import ProcessBar from '@mcashlight/popup/src/components/ProcessBar';
import { connect } from 'react-redux';
import { FormattedMessage, injectIntl } from 'react-intl';

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
                    <div className='line' />
                    <div className='cell bankSingle'>
                        <div className='title'>
                            <FormattedMessage
                                id='CONFIRMATIONS.RESOURCE.ENERGY'
                                children={ value => (
                                    <span className='light-color'>{value}</span>
                                ) }
                            />
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
