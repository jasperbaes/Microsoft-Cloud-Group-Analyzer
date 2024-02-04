const helper = require('../helper');

async function init(accessToken, accessTokenAzure, groupID, groupName, tenantID) {
    let result = await helper.getAllWithNextLink(accessToken, `/beta/deviceManagement/configurationPolicies?$expand=assignments&$select=id,assignments,name`)

    if (result == undefined) {
        return null
    }
    
    return result
    .filter(res => (res.assignments.filter(assignment => assignment.target.groupId == groupID)?.length > 0))
    .map(res => ({
        "file": 'configurationPolicies',
        "groupID": groupID,
        "groupName": groupName,
        "service": "Intune Configuration Policy",
        "resourceID": res.id,
        "name": res.name,
        "details": `group '${groupName}'`
    }))
}


module.exports = { init }