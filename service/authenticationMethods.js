const helper = require('../helper');

async function init(accessToken, accessTokenAzure, groupID, groupName, tenantID) {
    let result = await helper.callApi(`https://graph.microsoft.com/beta/policies/authenticationMethodsPolicy?$select=authenticationMethodConfigurations`, accessToken);

    if (result == undefined) {
        return null
    }
    
    return result?.authenticationMethodConfigurations
        .filter(res => (res.includeTargets.filter(x => x.id == groupID).length > 0) || (res.excludeTargets.filter(x => x.id == groupID).length > 0))
        .map(res => ({
            "file": 'authenticationMethods',
            "groupID": groupID,
            "groupName": groupName,
            "service": "Entra ID Authentication Method",
            "resourceID": res.id,
            "name": res.id,
            "details": `group '${groupName}' is ${(res.includeTargets.filter(x => x.id == groupID).length > 0) ? 'included' : 'excluded'} (authentication method is ${res.state})`
    }))

    return []
}


module.exports = { init }