export const APP_STATE = {
    // Wallet is migrating / not unlocked
    UNINITIALISED: 0, // [x] First user creates password
    PASSWORD_SET: 1, // [x] Password is set, but the wallet is locked. Next step is UNLOCKED

    // Wallet is unlocked
    UNLOCKED: 2, // [x] User is given two options - restore account or create new account
    CREATING: 3, // [x] Shown if a user is creating a new account (startup or in general). Next step is READY
    RESTORING: 4, // [x] Shown when the user is restoring (or in general importing) an account. Next step is READY

    // Wallet is functional
    READY: 5, // [x] User is logged in (and at least 1 account exists)
    REQUESTING_CONFIRMATION: 6, // [x] Shown if confirmations are queued
    RECEIVE: 7, //[x] Show if need to accept MCASH or tokens
    SEND: 8, //[x] Show if need to send MCASH or tokens
    TRANSACTIONS: 9, //[x] Show transactions record
    SETTING: 10, //[x] Show setting
    ADD_TRC20_TOKEN: 11, //[x] Show setting
    TRONBANK: 12, // [x] show TronBank page
    TRONBANK_RECORD: 13, //[x] show TronBankRecord page
    TRONBANK_DETAIL: 14, //[X] show TronBankDetail page
    TRONBANK_HELP: 15,
    DAPP_LIST: 16, //[X]show dapp list
    ACTIVE_ACCOUNT: 17
}; // User can delete *all* accounts. This will set the appState to UNLOCKED.

export const ACCOUNT_TYPE = {
    MNEMONIC: 0,
    PRIVATE_KEY: 1
};

export const VALIDATION_STATE = {
    NONE: 'no-state',
    INVALID: 'is-invalid',
    VALID: 'is-valid'
};

export const BANK_STATE = {
    INVALID: false,
    VALID: true
};

export const CREATION_STAGE = {
    SETTING_NAME: 0,
    WRITING_PHRASE: 1,
    CONFIRMING_PHRASE: 2,
    SUCCESS: 3
};

export const RESTORATION_STAGE = {
    SETTING_NAME: 0,
    CHOOSING_TYPE: 1,
    IMPORT_PRIVATE_KEY: 2,
    IMPORT_TRONWATCH_LEGACY: 3,
    IMPORT_TRONSCAN: 4,
    IMPORT_MNEMONIC: 5,
    SUCCESS: 6
};

export const BUTTON_TYPE = {
    PRIMARY: 'primary',
    SECONDARY: 'secondary',
    SUCCESS: 'success',
    DANGER: 'danger',
    WHITE: 'white'
};

export const PAGES = {
    ACCOUNTS: 0,
    TRANSACTIONS: 1,
    TOKENS: 2,
    SEND: 3,
    SETTINGS: 4
};

export const SUPPORTED_CONTRACTS = [
    'TransferContract',
    'TransferAssetContract',
    'FreezeBalanceContract',
    'UnfreezeBalanceContract',
    'TriggerSmartContract',
    'StakeContract',
    'UnstakeContract',
    'VoteWitnessContract'
];

export const CONFIRMATION_TYPE = {
    STRING: 0,
    TRANSACTION: 1
};
