const helper = require('../helper');

async function init(accessToken, accessTokenAzure, groupID, groupName, tenantID) {
    let result = await helper.getAllWithNextLink(accessToken, `/beta/groups/${groupID}/appRoleAssignments?$select=id,resourceDisplayName`)

    if (result == undefined) {
        return null
    }

    return result
        .map(res => ({
            "file": 'app',
            "groupID": groupID,
            "groupName": groupName,
            "service": "Entra ID Enterprise Application",
            "resourceID": res.id,
            "name": res.resourceDisplayName,
            "detailsGroup": `has member group '${groupName}'`,
            "details": ``
    }))
}


module.exports = { init }