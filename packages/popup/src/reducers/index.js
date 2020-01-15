import { appReducer } from './appReducer';
import { accountsReducer } from './accountsReducer';
import { confirmationsReducer } from './confirmationsReducer';
import { sendingReducer } from './sendingReducer';

export default {
    app: appReducer,
    accounts: accountsReducer,
    confirmations: confirmationsReducer,
    sending: sendingReducer
};
