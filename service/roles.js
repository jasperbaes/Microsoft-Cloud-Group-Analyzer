const helper = require('../helper');

async function init(accessToken, accessTokenAzure, groupID, groupName, tenantID) {
    let result = await helper.getAllWithNextLink(accessToken, `/beta/groups/${groupID}/memberof?$select=id,displayName`)

    if (result == undefined) {
        return null
    }
    
    return result
        .filter(res => res['@odata.type'] == '#microsoft.graph.directoryRole')
        .map(res => ({
            "file": 'roles',
            "groupID": groupID,
            "groupName": groupName,
            "service": "Entra ID Directory role",
            "resourceID": res.id,
            "name": res.displayName,
            "detailsGroup": `role for group '${groupName}'`,
            "details": ``
    }))
}


module.exports = { init }