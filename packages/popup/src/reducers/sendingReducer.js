import { createReducer, createAction } from 'redux-starter-kit';

export const setInputDefault = createAction('setInputDefault');
export const resetInputDefault = createAction('resetInputDefault');

export const sendingReducer = createReducer({
    inputDefault: {}
}, {
    [ setInputDefault ]: (state, { payload }) => {
        state.inputDefault = payload;
    },
    [ resetInputDefault ]: (state) => {
        state.inputDefault = {};
    }
});
