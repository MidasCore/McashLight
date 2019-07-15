import crypto from 'crypto';
import bip39 from 'bip39';
import bip32 from 'bip32';
import McashWeb from 'mcashweb';
import Logger from './logger';

const logger = new Logger('utils');

const Utils = {
    encryptionAlgorithm: 'aes-256-ctr',
    hashAlgorithm: 'sha256',

    stringToByte(str) {
        var bytes = new Array();
        var len, c;
        len = str.length;
        for(var i = 0; i < len; i++) {
            c = str.charCodeAt(i);
            if(c >= 0x010000 && c <= 0x10FFFF) {
                bytes.push(((c >> 18) & 0x07) | 0xF0);
                bytes.push(((c >> 12) & 0x3F) | 0x80);
                bytes.push(((c >> 6) & 0x3F) | 0x80);
                bytes.push((c & 0x3F) | 0x80);
            } else if(c >= 0x000800 && c <= 0x00FFFF) {
                bytes.push(((c >> 12) & 0x0F) | 0xE0);
                bytes.push(((c >> 6) & 0x3F) | 0x80);
                bytes.push((c & 0x3F) | 0x80);
            } else if(c >= 0x000080 && c <= 0x0007FF) {
                bytes.push(((c >> 6) & 0x1F) | 0xC0);
                bytes.push((c & 0x3F) | 0x80);
            } else {
                bytes.push(c & 0xFF);
            }
        }
        return bytes;
    },

    byteToString(arr) {
        if(typeof arr === 'string') {
            return arr;
        }
        var str = '',
            _arr = arr;
        for(var i = 0; i < _arr.length; i++) {
            var one = _arr[i].toString(2),
                v = one.match(/^1+?(?=0)/);
            if(v && one.length == 8) {
                var bytesLength = v[0].length;
                var store = _arr[i].toString(2).slice(7 - bytesLength);
                for(var st = 1; st < bytesLength; st++) {
                    store += _arr[st + i].toString(2).slice(2);
                }
                str += String.fromCharCode(parseInt(store, 2));
                i += bytesLength - 1;
            } else {
                str += String.fromCharCode(_arr[i]);
            }
        }
        return str;
    },

    hash(string) {
        return crypto
            .createHash(this.hashAlgorithm)
            .update(string)
            .digest('hex');
    },

    encrypt(data, key) {
        const encoded = JSON.stringify(data);
        const cipher = crypto.createCipher(this.encryptionAlgorithm, key);

        let crypted = cipher.update(encoded, 'utf8', 'hex');
        crypted += cipher.final('hex');

        return crypted;
    },

    decrypt(data, key) {
        const decipher = crypto.createDecipher(this.encryptionAlgorithm, key);

        let decrypted = decipher.update(data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    },

    requestHandler(target) {
        return new Proxy(target, {
            get(target, prop) {
                // First, check if the property exists on the target
                // If it doesn't, throw an error
                if(!Reflect.has(target, prop))
                    throw new Error(`Object does not have property '${ prop }'`);

                // If the target is a variable or the internal 'on'
                // method, simply return the standard function call
                if(typeof target[ prop ] !== 'function' || prop === 'on')
                    return Reflect.get(target, prop);

                // The 'req' object can be destructured into three components -
                // { resolve, reject and data }. Call the function (and resolve it)
                // so the result can then be passed back to the request.
                return (...args) => {
                    if(!args.length)
                        args[ 0 ] = {};

                    const [ firstArg ] = args;

                    const {
                        resolve = () => {},
                        reject = ex => console.error(ex),
                        data
                    } = firstArg;

                    if(typeof firstArg !== 'object' || !('data' in firstArg))
                        return target[ prop ].call(target, ...args);

                    Promise.resolve(target[ prop ].call(target, data))
                        .then(resolve)
                        .catch(reject);
                };
            }
        });
    },

    generateMnemonic() {
        return bip39.generateMnemonic(128);
    },

    getAccountAtIndex(mnemonic, index = 0, coinType = 2048) {
        const seed = bip39.mnemonicToSeed(mnemonic);
        const node = bip32.fromSeed(seed);
        const child = node.derivePath(`m/44'/${coinType}'/${ index }'/0/0`);
        const privateKey = child.privateKey.toString('hex');
        const address = McashWeb.address.fromPrivateKey(privateKey);

        return {
            privateKey,
            address
        };
    },

    validateMnemonic(mnemonic) {
        return bip39.validateMnemonic(mnemonic);
    },

    injectPromise(func, ...args) {
        return new Promise((resolve, reject) => {
            func(...args, (err, res) => {
                if(err)
                    reject(err);
                else resolve(res);
            });
        });
    },

    isFunction(obj) {
        return typeof obj === 'function';
    },

    dataLetterSort (data, field, field2) {
        let needArray = [];
        let list = {};
        let LetterArray = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','0','1','2','3','4','5','6','7','8','9'];
        for (let i = 0; i < data.length; i++) {
            const d = data[i][field] || data[i][field2] || data[i]['name'];
            let letter =  d.split('').filter(v=> v.match(/[a-zA-Z0-9]/)).join('').substr(0, 1).toUpperCase();
            if(!list[letter]) {
                list[letter] = [];
            }
            list[letter].push(data[i]);
        }
        LetterArray.forEach( v => {
            if(list[v]) {
                needArray = needArray.concat(list[v])
            }
        });
        return needArray;
    },

    validatInteger(str) { // integer
        const reg = /^\+?[1-9][0-9]*$/;
        return reg.test(str);
    },

    requestUrl() { // request url
        const curHost = location.hostname;
        let curApiHost;
        // const defaultUrl = 'http://52.14.133.221:8990'; //test
        const defaultUrl = 'https://manger.tronlending.org'; //online
        switch (curHost) {
            case 'nnceancbokoldkjjbpopcffaoekebnnb':
                curApiHost = defaultUrl;
                break;
            case 'ibnejdfjmmkpcnlpebklmnkoeoihofec':
                curApiHost = defaultUrl;
                break;
            default:
                curApiHost = defaultUrl;
                break;
        }
        return curApiHost;
    },

    timetransTime(date) {
        const newDate = new Date(date * 1000);
        const timeY = newDate.getFullYear();
        const timeM = (newDate.getMonth() + 1 < 10 ? `0${newDate.getMonth() + 1}` : newDate.getMonth() + 1);
        const timeD = (newDate.getDate() < 10 ? `0${newDate.getDate()}` : newDate.getDate());
        const timeh = (newDate.getHours() < 10 ? `0${newDate.getHours()}` : newDate.getHours());
        const timem = (newDate.getMinutes() < 10 ? `0${newDate.getMinutes()}` : newDate.getMinutes());
        return `${timeY}.${timeM}.${timeD} ${timeh}:${timem}`;
    },

    timeFormatTime(date) {
        const newDate = new Date(date * 1000);
        const timeY = newDate.getFullYear();
        const timeM = (newDate.getMonth() + 1 < 10 ? `0${newDate.getMonth() + 1}` : newDate.getMonth() + 1);
        const timeD = (newDate.getDate() < 10 ? `0${newDate.getDate()}` : newDate.getDate());
        const timeh = (newDate.getHours() < 10 ? `0${newDate.getHours()}` : newDate.getHours());
        const timem = (newDate.getMinutes() < 10 ? `0${newDate.getMinutes()}` : newDate.getMinutes());
        return `${timeY}/${timeM}/${timeD} ${timeh}:${timem}`;
    },

};

export default Utils;
