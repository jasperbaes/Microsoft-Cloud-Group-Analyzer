const helper = require('../helper');

async function init(accessToken, accessTokenAzure, groupID, groupName, tenantID) {
    let accessPackageCatalogs = await helper.getAllWithNextLink(accessToken, `/beta/identityGovernance/entitlementManagement/accessPackageCatalogs`)

    if (accessPackageCatalogs == undefined) {
        return null
    }

    let result = await helper.getAllWithNextLink(accessToken, `/beta/identityGovernance/entitlementManagement/accessPackageCatalogs/${accessPackageCatalogs[0]?.id}/accessPackageResources?$filter=(originId eq '${groupID}')`)

    if (result == undefined) {
        return null
    }

    return result
        .map(res => ({
            "file": 'accessPackageResource',
            "groupID": groupID,
            "groupName": groupName,
            "service": "Access Package Resource",
            "resourceID": res.id,
            "name": res.displayName,
            "details": `group '${groupName}'`
    }))
}


module.exports = { init }