import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Toast } from 'antd-mobile';
import { PAGES, APP_STATE } from '@mcashlight/lib/constants';
import { app } from '@mcashlight/popup/src/index';
import { PopupAPI } from '@mcashlight/lib/api';
const logo = require('@mcashlight/popup/src/assets/images/new/logo-full.svg');
const PageLink = props => {
    const {
        active = false,
        page,
        changePage
    } = props;

    const pageKey = `PAGES.${ page }`;
    const pageIndex = PAGES[ page ];

    return (
        <FormattedMessage
            id={ pageKey }
            children={ text => (
                <div
                    className={ `pageLink ${ active ? 'active' : '' }` }
                    onClick={ () => !active && changePage(pageIndex) }
                >
                    { text }
                </div>
            ) }
        />
    );
};

class Header extends React.Component {
    constructor(props) {
        super(props);
        this.onNodeChange = this.onNodeChange.bind(this);
        this.state={
            nodeIndex:0,
            //showNodeList:false,
            refresh:false
        }
    }

    componentDidMount() {
        const {nodes} = this.props;
        const ns = Object.entries(nodes.nodes);
        const nodeIndex = ns.map(([nodeId,obj],i)=>{obj.index = i;return [nodeId,obj]}).filter(([nodeId,obj]) => nodeId === nodes.selected)[0][1].index;
        this.setState({nodeIndex});
    }

    onNodeChange(nodeId,index) {
        PopupAPI.selectNode(nodeId);
        app.getNodes();
        this.setState({nodeIndex:index,showNodeList:!this.state.showNodeList});
    }

    render() {
        const { refresh } = this.state;
        const {
            developmentMode
        } = this.props;
        // const trxMarketUrl = developmentMode ? 'https://unidex.market?from=mcashlight' : 'https://unidex.market?from=mcashlight';
        return (
            <div className='header'>
                <div className='titleContainer'>
                    <div>
                        <img src={logo} alt=""/>
                    </div>
                    <div>
                        <div className="linkWrap">
                            <a href="https://t.me/MCashChain" target="_blank" className="link link-telegram" title={'Telegram'}></a>
                            <a href="https://mcash.network" target="_blank" className="link link-home" title={'McashChain'}></a>
                            {/*<a href={trxMarketUrl} target="_blank" className="link link-exchange"></a>*/}
                            {/*<a href="javascript:void(0)" onClick={()=>{*/}
                            {/*    PopupAPI.setGaEvent('Dapp List','Recommend','Recommend')*/}
                            {/*    PopupAPI.changeState(APP_STATE.DAPP_LIST)*/}
                            {/*}}  className="link link-dapp"></a>*/}
                        </div>
                        <div>
                            <div className="fun" title={'Lock'} onClick={ () => { PopupAPI.lockWallet(); } }></div>
                            <div className="fun" title={'Refresh'} onClick={() => {
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
                            ></div>
                            <div className="fun" title={'Setting'} onClick={ ()=>{ PopupAPI.changeState(APP_STATE.SETTING) } }></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Header;
