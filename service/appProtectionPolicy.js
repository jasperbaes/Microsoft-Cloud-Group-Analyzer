const helper = require('../helper');

async function init(accessToken, accessTokenAzure, groupID, groupName, tenantID) {
    let windows = await helper.getAllWithNextLink(accessToken, `/beta/deviceAppManagement/mdmWindowsInformationProtectionPolicies?$expand=assignments&$select=id,assignments,displayName`)
    let ios = await helper.getAllWithNextLink(accessToken, `/beta/deviceAppManagement/iosManagedAppProtections?$expand=assignments&$select=id,assignments,displayName`)
    let android = await helper.getAllWithNextLink(accessToken, `/beta/deviceAppManagement/androidManagedAppProtections?$expand=assignments&$select=id,assignments,displayName`)
    let windowsIP = await helper.getAllWithNextLink(accessToken, `/beta/deviceAppManagement/windowsInformationProtectionPolicies?$expand=assignments&$select=id,assignments,displayName`)
    let combinedArray = windows.concat(ios, android, windowsIP);

    if (combinedArray == undefined) {
        return null
    }

    return combinedArray
        .filter(res => (res.assignments.filter(assignment => assignment.target.groupId == groupID)?.length > 0))
        .map(res => ({
            "file": 'appProtectionPolicy',
            "groupID": groupID,
            "groupName": groupName,
            "service": "Intune App Protection Policy",
            "resourceID": res.id,
            "name": res.displayName,
            "details": `group '${groupName}'`
    }))
}


module.exports = { init }