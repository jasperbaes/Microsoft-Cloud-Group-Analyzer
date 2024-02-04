const helper = require('../helper');

async function init(accessToken, accessTokenAzure, groupID, groupName, tenantID) {
    let result = await helper.callApi(`https://graph.microsoft.com/beta/policies/authenticationMethodsPolicy`, accessToken);
    
    if (result == undefined) {
        return null
    }
    
    const createArrayFromTargets = (targets, detailSuffix) => 
        targets.filter(target => target.id === groupID).map(target => ({
            "file": 'mfaRegistration',
            "groupID": groupID,
            "groupName": groupName,
            "service": "MFA Registration Policy",
            "resourceID": 'authenticationMethodsPolicy',
            "name": 'MFA Registration',
            "details": `group '${groupName}' ${detailSuffix}`
        }));

    const registrationCampaign = result?.registrationEnforcement?.authenticationMethodsRegistrationCampaign || {};
    const includeArray = createArrayFromTargets(registrationCampaign.includeTargets, 'included');
    const excludeArray = createArrayFromTargets(registrationCampaign.excludeTargets, 'excluded');

    return [...includeArray, ...excludeArray];
    
}


module.exports = { init }