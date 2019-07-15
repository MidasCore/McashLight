import {
    APP_STATE,
    PAGES
} from '@mcashlight/lib/constants';

import {
    createReducer,
    createAction
} from 'redux-starter-kit';

export const setAppState = createAction('setAppState');
export const setNodes = createAction('setNodes');
export const setPage = createAction('setPage');
export const setPriceList = createAction('setPriceList');
export const setCurrency = createAction('setCurrency');
export const setLanguage = createAction('setLanguage');
export const setSetting = createAction('setSetting');
export const setVersion = createAction('setVersion');
export const setDappList = createAction('setDappList');

export const appReducer = createReducer({
    appState: APP_STATE.UNINITIALISED,
    currentPage: PAGES.ACCOUNTS,
    nodes: {
        nodes: {},
        selected: false
    },
    prices: {
        priceList: {},
        selected: false
    },
    language: 'en',
    setting: {
        developmentMode: false
    },
    version: '',
    dappList: {
        recommend:[],
        used:[]
    }

}, {
    [ setAppState ]: (state, { payload }) => {
        state.appState = payload;
    },
    [ setPriceList ]: (state, { payload }) => {
        state.prices.priceList = payload[0];
    },
    [ setCurrency ]: (state, { payload }) => {
        state.prices.selected = payload;
    },
    [ setNodes ]: (state, { payload }) => {
        state.nodes = payload;
    },
    [ setPage ]: (state, { payload }) => {
        state.currentPage = payload;
    },
    [ setLanguage ]: (state, { payload }) => {
        state.language = payload;
    },
    [ setSetting ]: (state, { payload }) => {
        state.setting = payload;
    },
    [ setVersion ]: (state, { payload }) => {
        state.version = payload;
    },
    [ setDappList ]: (state, { payload }) => {
        state.dappList = payload;
    }
});
