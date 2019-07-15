import Contracts from './contracts';

export default async (mcashWeb, contractType = false, parameters = false) => {
    if(!Contracts.hasOwnProperty(contractType))
        return { error: `Contract type ${ contractType } not supported` };

    const endpoint = Contracts[ contractType ];

    return {
        mapped: await mcashWeb.fullNode.request(endpoint, parameters, 'post')
    };
};
