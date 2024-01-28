const helper = require('../helper');

async function init(accessToken, accessTokenAzure, groupID, groupName, tenantID) {
    let result = await helper.getAllWithNextLink(accessToken, `/beta/policies/conditionalAccessPolicies`)

    if (result == undefined) {
        return null
    }
    
    return result
        .filter(res => res.conditions.users.excludeGroups.includes(groupID) || res.conditions.users.includeGroups.includes(groupID))
        .map(res => ({
            "file": 'conditionalAccess',
            "groupID": groupID,
            "service": "Entra ID Conditional Access Policy",
            "resourceID": res.id,
            "name": res.displayName,
            "details": `'${groupName}' ${(res.conditions.users.excludeGroups.includes(groupID) ? 'excluded from policy' : 'included in policy')} -- policy state: ${res.state}`
    }))
}


module.exports = { init }