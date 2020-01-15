import React from 'react';
import { FormattedMessage } from 'react-intl';
import swal from 'sweetalert2';
import Button from '@mcashlight/popup/src/components/Button';
import { VALIDATION_STATE } from '@mcashlight/lib/constants';
import { PopupAPI } from '@mcashlight/lib/api';
import { app } from '../../index';

export default class SettingAddNode extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            customNode: {
                name: {
                    value: '',
                    state: VALIDATION_STATE.NONE
                },
                fullNode: {
                    value: 'https://',
                    state: VALIDATION_STATE.NONE
                },
                solidityNode: {
                    value: 'https://',
                    state: VALIDATION_STATE.NONE
                },
                // eventServer: {
                //     value: 'https://',
                //     state: VALIDATION_STATE.NONE
                // },
                mcashScanApi: {
                    value: '',
                    state: VALIDATION_STATE.VALID
                },
                isValid: false
            }
        };
    }

    onCustomNameChange(name) {
        const { nodes } = this.props.nodes;

        name = name.replace(/\s{2,}/g, ' ');

        if(/^\s$/.test(name) || !name.length) {
            return this.setState({
                customNode: {
                    ...this.state.customNode,
                    isValid: false,
                    name: {
                        value: '',
                        state: VALIDATION_STATE.NONE
                    }
                }
            });
        }

        const { customNode } = this.state;
        // const nameState = (!Object.values(nodes).some(node => (
        //     node.name.toLowerCase() === name.trim().toLowerCase()
        // )) && name.trim().length >= 4) ?
        //     VALIDATION_STATE.VALID :
        //     VALIDATION_STATE.INVALID;
        const nameState = name.trim().length <= 4 ? 'EXCEPTION.ADD_NODE.NAME' : (
            Object.values(nodes).some(node => node.name === name.trim()) ? 'EXCEPTION.ADD_NODE.REPEAT_NAME' : VALIDATION_STATE.VALID
        );

        // const isValid =
        //     nameState === VALIDATION_STATE.VALID &&
        //     customNode.fullNode.state === VALIDATION_STATE.VALID &&
        //     customNode.solidityNode.state === VALIDATION_STATE.VALID &&
        //     customNode.eventServer.state === VALIDATION_STATE.VALID;

        const isValid =
            nameState === VALIDATION_STATE.VALID &&
            customNode.fullNode.state === VALIDATION_STATE.VALID &&
            customNode.solidityNode.state === VALIDATION_STATE.VALID;

        this.setState({
            customNode: {
                ...this.state.customNode,
                name: {
                    state: nameState,
                    value: name
                },
                isValid
            }
        });
    }

    onCustomNodeChange(nodeType, value, required = true) {
        if(!value.length && required) {
            return this.setState({
                customNode: {
                    ...this.state.customNode,
                    isValid: false,
                    [ nodeType ]: {
                        value: '',
                        state: !required ? VALIDATION_STATE.VALID : VALIDATION_STATE.NONE
                    }
                }
            });
        }

        const { customNode } = this.state;
        let nodeState = (!required && !value.length) ? VALIDATION_STATE.VALID : VALIDATION_STATE.INVALID;

        if (value.length) {
            try {
                new URL(value);
                nodeState = VALIDATION_STATE.VALID;
            } catch {}
        }

        customNode[ nodeType ].state = nodeState;

        // const isValid =
        //     customNode.name.state === VALIDATION_STATE.VALID &&
        //     customNode.fullNode.state === VALIDATION_STATE.VALID &&
        //     customNode.solidityNode.state === VALIDATION_STATE.VALID &&
        //     customNode.eventServer.state === VALIDATION_STATE.VALID;

        const isValid =
            customNode.name.state === VALIDATION_STATE.VALID &&
            customNode.fullNode.state === VALIDATION_STATE.VALID &&
            customNode.solidityNode.state === VALIDATION_STATE.VALID &&
            customNode.mcashScanApi.state === VALIDATION_STATE.VALID;

        this.setState({
            customNode: {
                ...this.state.customNode,
                [ nodeType ]: {
                    state: nodeState,
                    value
                },
                isValid
            }
        });
    }

    addCustomNode(e) {
        e.stopPropagation();
        const { formatMessage } = this.props.intl;
        const { customNode } = this.state;
        const name = customNode.name.value.trim();
        const fullNode = customNode.fullNode.value.trim();
        const solidityNode = customNode.solidityNode.value.trim();
        // const eventServer = customNode.eventServer.value.trim();
        const mcashScanApi = customNode.mcashScanApi.value.trim();

        PopupAPI.addNode({
            name,
            fullNode,
            solidityNode,
            // eventServer
            mcashScanApi
        });

        app.getNodes();
        swal(formatMessage({ id: 'SETTING.SUCCESS.ADD_NODE' }), '', 'success');
        this.setState({
            customNode: {
                name: {
                    value: '',
                    state: VALIDATION_STATE.NONE
                },
                fullNode: {
                    value: 'https://',
                    state: VALIDATION_STATE.NONE
                },
                solidityNode: {
                    value: 'https://',
                    state: VALIDATION_STATE.NONE
                },
                // eventServer: {
                //     value: 'https://',
                //     state: VALIDATION_STATE.NONE
                // },
                mcashScanApi: {
                    value: '',
                    state: VALIDATION_STATE.VALID
                },
                isValid: false
            }
        });
    }

    render () {
        const { formatMessage } = this.props.intl;
        const {
            name,
            fullNode,
            solidityNode,
            // eventServer,
            mcashScanApi,
            isValid
        } = this.state.customNode;

        return (
            <div className='txt'>
                <div className='span'>
                    <FormattedMessage id='SETTING.TITLE.ADD_NODE' />
                </div>
                <div className='settingWrap' onClick={(e) => { e.stopPropagation(); }}>
                    <div className={`input-group${!isValid && name.state !== VALIDATION_STATE.VALID && name.state !== VALIDATION_STATE.NONE ? ' error' : ''}`}>
                        <label>
                            <FormattedMessage id='SETTINGS.CUSTOM_NODE.NAME' />
                        </label>
                        <div className='input'>
                            <input type='text' value={name.value} placeholder={formatMessage({ id: 'SETTINGS.CUSTOM_NODE.NAME.PLACEHOLDER' })} onChange={ (e) => this.onCustomNameChange(e.target.value) }/>
                        </div>
                        {
                            !isValid && name.state !== VALIDATION_STATE.VALID && name.state !== VALIDATION_STATE.NONE ? <div className='tipError'><FormattedMessage id={name.state || 'EXCEPTION.ADD_NODE.NAME'} /></div> : null
                        }
                    </div>
                    <div className={`input-group${!isValid && fullNode.state === VALIDATION_STATE.INVALID ? ' error' : ''}`}>
                        <label>
                            <FormattedMessage id='SETTINGS.NODES.FULL_NODE' />
                        </label>
                        <div className='input'>
                            <input type='text' value={fullNode.value} placeholder={formatMessage({ id: 'SETTINGS.CUSTOM_NODE.FULL_NODE.PLACEHOLDER' })} onChange={ e => this.onCustomNodeChange('fullNode', e.target.value) } />
                        </div>
                        {
                            !isValid && fullNode.state === VALIDATION_STATE.INVALID ? <div className='tipError'><FormattedMessage id='EXCEPTION.ADD_NODE.NODE_URL' /></div> : null
                        }
                    </div>
                    <div className={`input-group${!isValid && solidityNode.state === VALIDATION_STATE.INVALID ? ' error' : ''}`}>
                        <label>
                            <FormattedMessage id='SETTINGS.NODES.SOLIDITY_NODE' />
                        </label>
                        <div className='input'>
                            <input type='text' value={solidityNode.value} placeholder={formatMessage({ id: 'SETTINGS.CUSTOM_NODE.SOLIDITY_NODE.PLACEHOLDER' })} onChange={ e => this.onCustomNodeChange('solidityNode', e.target.value) }/>
                        </div>
                        {
                            !isValid && solidityNode.state === VALIDATION_STATE.INVALID ? <div className='tipError'><FormattedMessage id='EXCEPTION.ADD_NODE.NODE_URL' /></div> : null
                        }
                    </div>
                    {/*<div className={"input-group"+(!isValid && eventServer.state === VALIDATION_STATE.INVALID ? ' error':'')}>*/}
                    {/*<label>*/}
                    {/*<FormattedMessage id="SETTINGS.NODES.EVENT_SERVER" />*/}
                    {/*</label>*/}
                    {/*<div className="input">*/}
                    {/*<input type="text" value={eventServer.value} placeholder={formatMessage({id:"SETTINGS.CUSTOM_NODE.EVENT_SERVER.PLACEHOLDER"})} onChange={ e => this.onCustomNodeChange('eventServer', e.target.value) } />*/}
                    {/*</div>*/}
                    {/*{*/}
                    {/*!isValid && eventServer.state === VALIDATION_STATE.INVALID ? <div className="tipError"><FormattedMessage id="EXCEPTION.ADD_NODE.NODE_URL" /></div>:null*/}
                    {/*}*/}
                    {/*</div>*/}
                    <div className={`input-group${!isValid && mcashScanApi.state === VALIDATION_STATE.INVALID ? ' error' : ''}`}>
                        <label>
                            <FormattedMessage id='SETTINGS.CUSTOM_NODE.SCAN' />
                        </label>
                        <div className='input'>
                            <input type='text' value={mcashScanApi.value} placeholder={formatMessage({ id: 'SETTINGS.CUSTOM_NODE.SCAN.PLACEHOLDER' })} onChange={ e => this.onCustomNodeChange('mcashScanApi', e.target.value, false) } />
                        </div>
                        {
                            !isValid && mcashScanApi.state === VALIDATION_STATE.INVALID ? <div className='tipError'><FormattedMessage id='EXCEPTION.ADD_NODE.NODE_URL' /></div> : null
                        }
                    </div>
                    <Button
                        id='SETTINGS.CUSTOM_NODE'
                        isValid={ isValid }
                        onClick={ (e) => { this.addCustomNode(e); } }
                    />
                </div>
            </div>
        );
    }
}
