const helper = require('../helper');

async function init(accessToken, accessTokenAzure, groupID, groupName, tenantID) {
    let result = await helper.getAllWithNextLink(accessToken, `/beta/deviceManagement/windowsAutopilotDeploymentProfiles?$expand=assignments`)

    if (result == undefined) {
        return null
    }
    
    return result
        .filter(res => res.assignments.filter(assignment => assignment.target.groupId == groupID)?.length > 0)
        .map(res => ({
            "file": 'windowsAutopilotDeploymentProfile',
            "groupID": groupID,
            "service": "Intune Windows Autopilot Deployment Profile",
            "resourceID": res.id,
            "name": res.displayName,
            "details": `role for group '${groupName}'`
    }))
}


module.exports = { init }