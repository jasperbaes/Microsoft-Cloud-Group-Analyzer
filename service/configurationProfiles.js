const helper = require('../helper');

async function init(accessToken, accessTokenAzure, groupID, groupName, tenantID) {
    let result = await helper.getAllWithNextLink(accessToken, `/beta/deviceManagement/deviceConfigurations?$expand=assignments`)

    if (result == undefined) {
        return null
    }
    
    return result
        .filter(res => res.assignments.filter(assignment => assignment.target.groupId == groupID)?.length > 0)
        .map(res => ({
            "file": 'configurationProfiles',
            "groupID": groupID,
            "service": "Intune Device Configuration Profile",
            "resourceID": res.id,
            "name": res.displayName,
            "details": `group '${groupName}'`
    }))
}


module.exports = { init }