const helper = require('../helper');

async function init(accessToken, accessTokenAzure, groupID, groupName, tenantID) {
    let result = await helper.getAllWithNextLink(accessToken, `/beta/groups/${groupID}/memberOf?$select=id,displayName`)

    if (result == undefined) {
        return null
    }
    
    return result
        .filter(res => res['@odata.type'] == '#microsoft.graph.group')    
        .map(res => ({
            "file": 'groups',
            "groupID": groupID,
            "groupName": groupName,
            "service": "Entra Group",
            "resourceID": res.id,
            "name": res.displayName,
            "detailsGroup": `Parent group of '${groupName}'`,
            "details": ``
    }))
}


module.exports = { init }