const helper = require('../helper');

async function init(accessToken, accessTokenAzure, groupID, groupName, tenantID) {
    let result = await helper.getAllWithNextLink(accessToken, `/beta/deviceAppManagement/targetedManagedAppConfigurations?$expand=assignments&$select=id,assignments,displayName`)

    if (result == undefined) {
        return null
    }
    
    return result
    .filter(res => (res.assignments.filter(assignment => assignment.target.groupId == groupID)?.length > 0))
    .map(res => ({
        "file": 'appConfigurationPolicies',
        "groupID": groupID,
        "groupName": groupName,
        "service": "Intune App Configuration Policy",
        "resourceID": res.id,
        "name": res.displayName,
        "details": `group '${groupName}'`
    }))
}


module.exports = { init }