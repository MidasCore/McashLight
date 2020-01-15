import React from 'react';
import { FormattedMessage } from 'react-intl';
import swal from 'sweetalert2';
import { PopupAPI } from '@mcashlight/lib/api';
import { app } from '../../index';
import CConfirmModal from '../../components/CConfirmModal';

export default class SettingNode extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            confirmDelete: false,
            nodeWillBeDeleted: {}
        };
    }

    confirmDeleteNodeByID = (nodeID, node) => {
        this.setState({
            confirmDelete: true,
            nodeWillBeDeleted: {
                ...(node || {}),
                id: nodeID
            }
        });
    };

    onCloseConfirmDelete = () => {
        this.setState({ confirmDelete: false });
    };

    onDeleteNode = (e) => {
        if (e) e.stopPropagation();
        const { id } = this.state.nodeWillBeDeleted;
        PopupAPI.deleteNode(id);
        const { formatMessage } = this.props.intl;
        swal(formatMessage({ id: 'SETTINGS.NODE.DELETE.SUCCESS' }), '', 'success');
        app.getNodes();
        if (this.props.onResize)
            this.props.onResize();
        this.onCloseConfirmDelete();
    };

    onCancelDeleteNode = (e) => {
        if (e) e.stopPropagation();
        this.onCloseConfirmDelete();
    };

    render () {
        const { nodes, currentNode } = this.props;
        const { name } = this.state.nodeWillBeDeleted;
        return (
            <div className='txt'>
                <CConfirmModal
                    visible={this.state.confirmDelete}
                    title={<FormattedMessage id={'SETTINGS.NODE.DELETE'} />}
                    message={<FormattedMessage id={'SETTINGS.NODE.CONFIRM_DELETE'} values={{ name }} />}
                    onOk={this.onDeleteNode}
                    onCancel={this.onCancelDeleteNode}
                />

                <div className='span'>
                    <FormattedMessage id='SETTING.TITLE.NODE' />
                    <div className='unit'>{currentNode.name}</div>
                </div>
                <div className='settingWrap'>
                    <div className='nodeWrap'>
                        {
                            Object.entries(nodes.nodes).map(([nodeId, node], index) => {
                                return (
                                    <div
                                        key={index} className={`nodeItem${nodeId === nodes.selected ? ' selected' : ''}`}
                                    >
                                        {
                                            node.readOnly ? null : (
                                                <button
                                                    className='btn-delete'
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        this.confirmDeleteNodeByID(nodeId, node);
                                                    }}
                                                />
                                            )
                                        }
                                        <div
                                            className='nodeItem__content'
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                PopupAPI.selectNode(nodeId);
                                                app.getNodes();
                                            }}
                                        >
                                            <div className='title'>{node.name}</div>
                                            <div className='cell'>
                                                <FormattedMessage id='SETTINGS.NODES.FULL_NODE' />
                                                <span>{node.fullNode}</span>
                                            </div>
                                            <div className='cell'>
                                                <FormattedMessage id='SETTINGS.NODES.SOLIDITY_NODE' />
                                                <span>{node.solidityNode}</span>
                                            </div>
                                            {/*<div className="cell">*/}
                                            {/*<FormattedMessage id="SETTINGS.NODES.EVENT_SERVER" />*/}
                                            {/*<span>{node.eventServer}</span>*/}
                                            {/*</div>*/}
                                            <div className='cell'>
                                                <FormattedMessage id='SETTINGS.NODES.SCAN' />
                                                <span>{ !node.hideApi ? node.mcashScanApi : '' }</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </div>
                </div>
            </div>
        );
    }
}
