const helper = require('../helper');

async function init(accessToken, accessTokenAzure, groupID, groupName, tenantID) {
    let result = await helper.getAllWithNextLink(accessToken, `/beta/deviceAppManagement/mobileApps?$expand=assignments&$select=id,assignments,displayName`)

    if (result == undefined) {
        return null
    }

    return result
    .filter(res => (res.assignments.filter(assignment => assignment.target.groupId == groupID)?.length > 0))
    .map(res => ({
        "file": 'appAssignments',
        "groupID": groupID,
        "groupName": groupName,
        "service": "Intune App Assignment Policy",
        "resourceID": res.id,
        "name": res.displayName,
        "detailsGroup": `group '${groupName}'`,
        "details": ``
    }))
}


module.exports = { init }