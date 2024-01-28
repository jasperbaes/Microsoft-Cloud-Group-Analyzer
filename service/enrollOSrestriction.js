const helper = require('../helper');

async function init(accessToken, accessTokenAzure, groupID, groupName, tenantID) {
    let result = await helper.getAllWithNextLink(accessToken, `/beta/deviceManagement/deviceEnrollmentConfigurations?$expand=assignments`)

    if (result == undefined) {
        return null
    }
    
    return result
        .filter(res => res['@odata.type'] == '#microsoft.graph.deviceEnrollmentPlatformRestrictionConfiguration')    
        .filter(res => (res.assignments.filter(assignment => assignment.target.groupId == groupID)?.length > 0))
        .map(res => ({
            "file": 'enrollOSrestriction',
            "groupID": groupID,
            "service": "Intune Enrollment Device Platform Restriction",
            "resourceID": res.id,
            "name": `${res.displayName} - ${res.platformType}`,
            "details": `group '${groupName}'`
    }))
}


module.exports = { init }