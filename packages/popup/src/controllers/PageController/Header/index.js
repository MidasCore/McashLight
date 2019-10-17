import React from 'react';
import { Toast } from 'antd-mobile';
import { APP_STATE } from '@mcashlight/lib/constants';
import { app } from '@mcashlight/popup/src/index';
import { PopupAPI } from '@mcashlight/lib/api';
const logo = require('@mcashlight/popup/src/assets/images/new/logo-full.svg');

class Header extends React.Component {
    constructor(props) {
        super(props);
        this.onNodeChange = this.onNodeChange.bind(this);
        this.state = {
            nodeIndex: 0,
            //showNodeList:false,
            refresh: false
        };
    }

    componentDidMount() {
        const { nodes } = this.props;
        const ns = Object.entries(nodes.nodes);
        const nodeIndex = ns.map(([nodeId, obj], i) => { obj.index = i;return [nodeId, obj]; }).filter(([nodeId, obj]) => nodeId === nodes.selected)[ 0 ][ 1 ].index;
        this.setState({ nodeIndex });
    }

    onNodeChange(nodeId, index) {
        PopupAPI.selectNode(nodeId);
        app.getNodes();
        this.setState({ nodeIndex: index, showNodeList: !this.state.showNodeList });
    }

    openMenu = () => {
        if (this.props.openAccountsMenu)
            this.props.openAccountsMenu();
    };

    render() {
        const { refresh } = this.state;
        return (
            <div className='header'>
                <div className='titleContainer'>
                    <div style={{ cursor: 'pointer' }} onClick={this.openMenu}>
                        <img src={logo} alt=''/>
                    </div>
                    <div>
                        <div className='linkWrap'>
                            <a
                                href='https://t.me/MCashChain'
                                target='_blank'
                                rel='noopener noreferrer'
                                className='link link-telegram'
                                title={'Telegram'}
                            />
                            <a
                                href='https://mcash.network'
                                target='_blank'
                                rel='noopener noreferrer'
                                className='link link-home'
                                title={'McashChain'}
                            />
                        </div>
                        <div>
                            <div className='fun' title={'Lock'} onClick={ () => { PopupAPI.lockWallet(); } } />
                            <div className='fun' title={'Refresh'} onClick={() => {
                                if(!refresh) {
                                    this.setState({ refresh: true }, async() => {
                                        Toast.loading();
                                        const r = await PopupAPI.refresh();
                                        if(r) {
                                            this.setState({ refresh: false });
                                            Toast.hide();
                                        }
                                    });
                                }
                            }}
                            >
                            </div>
                            <div className='fun' title={'Setting'} onClick={ () => { PopupAPI.changeState(APP_STATE.SETTING); } } />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Header;
