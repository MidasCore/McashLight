import React from 'react';
import { PopupAPI } from '@mcashlight/lib/api';
import { FormattedMessage, injectIntl } from 'react-intl';
import SettingNode from './SettingNode';
import SettingAddNode from './SettingAddNode';
import SettingCurrency from './SettingCurrency';
import './SettingController.scss';

class SettingController extends React.Component {
    cellRef = null;

    constructor(props) {
        super(props);
        this.state = {
            languages: [
                { name: 'English', key: 'en', selected: true },
                { name: '中文', key: 'zh', selected: false },
                { name: '日本語', key: 'ja', selected: false },
            ],
            autoLock: [{
                time: 60 * 1000,
                name: 'SETTING.TITLE.AUTO_LOCK.1_MIN'
            }, {
                time: 5 * 60 * 1000,
                name: 'SETTING.TITLE.AUTO_LOCK.5_MIN'
            }, {
                time: 10 * 60 * 1000,
                name: 'SETTING.TITLE.AUTO_LOCK.10_MIN'
            }, {
                time: 30 * 60 * 1000,
                name: 'SETTING.TITLE.AUTO_LOCK.30_MIN'
            }, {
                time: 0,
                name: 'SETTING.TITLE.AUTO_LOCK.NEVER'
            }]
        };
    }

    setting(index) {
        const { nodes } = this.props;
        if (!this.cellRef)
            return;
        const options = this.cellRef.getElementsByClassName('option');
        if(index !== 0 ) {
            for(let i = 0;i < options.length;i++) {
                if(index === i) {
                    if(options[ i ].className.match(/active/))
                        options[ i ].classList.remove('active');
                    else
                        options[ i ].classList.add('active');
                } else {
                    options[ i ].classList.remove('active');
                    options[ 0 ].getElementsByClassName('settingWrap')[ 0 ].style.height = '0px';
                }
            }
        } else {
            const idx = parseInt(options[ 0 ].getElementsByClassName('settingWrap')[ 0 ].style.height);
            if(!idx) {
                options[ 0 ].getElementsByClassName('settingWrap')[ 0 ].style.height = `${16 + (122 * Object.keys(nodes.nodes).length)}px`;
                if(!options[ 0 ].className.match(/active/))
                    options[ 0 ].classList.add('active');
            } else {
                options[ 0 ].getElementsByClassName('settingWrap')[ 0 ].style.height = '0px';
                if(options[ 0 ].className.match(/active/))
                    options[ 0 ].classList.remove('active');
            }
        }
    }

    render() {
        const { prices, nodes, onCancel, language, lock, version } = this.props;
        const currentNode = nodes.nodes[ nodes.selected ];
        const { languages, autoLock } = this.state;

        return (
            <div className='insetContainer choosingType2 setting-controller'>
                <div className='pageHeader'>
                    <div className='back' onClick={ onCancel } />
                    <FormattedMessage id='SETTING.TITLE' />
                </div>
                <div className='greyModal' ref={ ref => this.cellRef = ref }>
                    <div className='optionsWrap'>
                        <div className='option' onClick={ () => { this.setting(0); } }>
                            <SettingNode {...this.props} currentNode={currentNode} onResize={() => this.setting(0)} />
                        </div>
                        <div className='option' onClick={ () => { this.setting(1); } } >
                            <SettingAddNode {...this.props} />
                        </div>
                        <div className='option' onClick={ () => { this.setting(2); } }>
                            <SettingCurrency prices={prices} />
                        </div>
                        <div className='option' onClick={ () => { this.setting(3); } }>
                            <div className='txt'>
                                <div className='span'>
                                    <FormattedMessage id='SETTING.TITLE.LANGUAGE' />
                                    <div className='unit'>
                                        {
                                            languages.filter(({ key }) => key === language)[ 0 ].name
                                        }
                                    </div>
                                </div>
                                <div className='settingWrap'>
                                    {
                                        languages.map(({ name, selected, key }) => <div key={name} onClick={(e) => { e.stopPropagation();PopupAPI.setLanguage(key); }} className={`unit${key === language ? ' selected' : ''}`}>{name}</div>)
                                    }
                                </div>
                            </div>
                        </div>
                        <div className='option' onClick={() => { this.setting(4); } }>
                            <div className='txt'>
                                <div className='span'>
                                    <FormattedMessage id='SETTING.TITLE.AUTO_LOCK' />
                                    <div className='unit'>
                                        <FormattedMessage id={autoLock.filter(({ time }) => time === lock.duration)[ 0 ].name} />
                                    </div>
                                </div>
                                <div className='settingWrap'>
                                    {
                                        autoLock.map(({ name, time }) => (
                                            <div key={time} onClick={async (e) => {
                                                e.stopPropagation();
                                                const setting = await PopupAPI.getSetting();
                                                setting.lock = { lockTime: new Date().getTime(), duration: time };
                                                PopupAPI.setSetting(setting);
                                            }} className={`unit${time === lock.duration ? ' selected' : ''}`}
                                            >
                                                <FormattedMessage id={name} />
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>

                        </div>
                        <div className='option' onClick={() => { PopupAPI.lockWallet(); } }>
                            <div className='txt'>
                                <FormattedMessage id='SETTING.TITLE.LOCK' />
                            </div>
                        </div>
                    </div>
                    <div className='version'>
                        <FormattedMessage id='COMMON.CURRENT_VERSION' values={{ version }} />
                    </div>
                </div>
            </div>
        );
    }
}

export default injectIntl(SettingController);
