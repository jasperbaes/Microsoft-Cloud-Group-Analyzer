const index = require('./index');
const axios = require('axios');
const msal = require('@azure/msal-node');
const NodeCache = require( "node-cache" );
const myCache = new NodeCache();
const identity = require('@azure/identity')

global.forbiddenErrors = []

async function getToken() {
    // If the client secret is filled in, then get token from the Azure App Registration
    if (global.clientSecret && global.clientSecret.length > 0) {
        var msalConfig = {
            auth: {
                clientId: clientID,
                authority: 'https://login.microsoftonline.com/' + tenantID,
                clientSecret: clientSecret,
            }
        };

        const tokenRequest = {
            scopes: [
                'https://graph.microsoft.com/.default'
            ]
        };
        
        try {
            const cca = new msal.ConfidentialClientApplication(msalConfig);
            return await cca.acquireTokenByClientCredential(tokenRequest);
        } catch (error) {
            console.error(' ERROR: error while retrieving access token. Please check the script variables and permissions!\n\n', error)
            process.exit()
        }
    } else {  // else get the token from the logged in user
        try {
            const credential = new identity.DefaultAzureCredential()
            let token = await credential.getToken('https://graph.microsoft.com/.default')
            return {accessToken: token.token}
        } catch (error) {
            console.error(' ERROR: error while retrieving access token from logged in session user. Please check the script variables and permissions!\n\n', error)
            process.exit()
        }
    }
}

async function getTokenAzure() {
    // If the client secret is filled in, then get token from the Azure App Registration
    if (global.clientSecret && global.clientSecret.length > 0) {
        var msalConfig2 = {
            auth: {
                clientId: clientID,
                authority: 'https://login.microsoftonline.com/' + tenantID,
                clientSecret: clientSecret,
            }
        };
        
        const cca = new msal.ConfidentialClientApplication(msalConfig2);

        const clientCredentialRequest = {
            scopes: ["https://management.core.windows.net/.default"],
        };

        return await cca.acquireTokenByClientCredential(clientCredentialRequest)
    } else {  // else get the token from the logged in user
        try {
            const credential = new identity.DefaultAzureCredential()
            let token = await credential.getToken('https://management.core.windows.net/.default')
            return {accessToken: token.token}
        } catch (error) {
            console.error(' ERROR: error while retrieving access token from logged in session user. Please check the script variables and permissions!\n\n', error)
            process.exit()
        }
    }
}

async function getAllWithNextLink(accessToken, urlParameter) {
    let arr = []
    let url = "https://graph.microsoft.com" + urlParameter

    try {
        do {
            let res =  await callApi(url, accessToken);
            let data = await res?.value
            url = res['@odata.nextLink']
            arr.push(...data)
        } while(url)
    } catch (error) {
    }

    return arr
}

async function callApi(endpoint, accessToken) { 
    // if the result is already in cache, then immediately return that result
    if (myCache.get(endpoint) != undefined) {
        return myCache.get(endpoint)
    }

    const options = {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    };

    try {
        const response = await axios.default.get(endpoint, options);
        if (myCache.get(endpoint) == undefined) myCache.set(endpoint, response.data, 120); // save to cache for 120 seconds
        return response.data;
    } catch (error) {
        if (error.response.status == 403) {
            global.forbiddenErrors.push(error.response?.config?.url)
        }
    }
};

module.exports = { getToken, getTokenAzure, getAllWithNextLink, callApi }