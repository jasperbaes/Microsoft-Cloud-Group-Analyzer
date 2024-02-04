const helper = require('../helper');

async function init(accessToken, accessTokenAzure, groupID, groupName, tenantID) {
    let accessPackages = await helper.getAllWithNextLink(accessToken, `/beta/identityGovernance/entitlementManagement/accessPackages?$select=id,displayName`)
    let result = await helper.getAllWithNextLink(accessToken, `/beta/identityGovernance/entitlementManagement/accessPackageAssignmentPolicies`)

    if (result == undefined) {
        return null
    }

    return result.filter(res => (res?.requestorSettings?.allowedRequestors?.filter(assignment => assignment?.id == groupID)?.length > 0))
        .map(res => ({
            "file": 'accessPackage',
            "groupID": groupID,
            "groupName": groupName,
            "service": "Access Package",
            "resourceID": res.id,
            "name": `${accessPackages?.find(accessPackage => accessPackage?.id == res?.accessPackageId)?.displayName} (${res?.displayName})`,
            "details": `group '${groupName}'`
    }))
}


module.exports = { init }