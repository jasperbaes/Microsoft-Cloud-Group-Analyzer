const helper = require('../helper');

async function init(accessToken, accessTokenAzure, groupID, groupName, tenantID) {
    let result = await helper.getAllWithNextLink(accessToken, `/beta/deviceManagement/deviceEnrollmentConfigurations?$expand=assignments`)

    if (result == undefined) {
        return null
    }
    
    return result
        .filter(res => res['@odata.type'] == '#microsoft.graph.deviceEnrollmentLimitConfiguration')    
        .filter(res => (res.assignments.filter(assignment => assignment.target.groupId == groupID)?.length > 0))
        .map(res => ({
            "file": 'enrollLimitRestriction',
            "groupID": groupID,
            "service": "Intune Enrollment Device Limit Restriction",
            "resourceID": res.id,
            "name": res.displayName
    }))
}


module.exports = { init }