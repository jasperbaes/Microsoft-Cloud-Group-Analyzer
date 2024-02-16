// https://graph.microsoft.com/beta/groups/008d4714-2637-47f5-af24-7a3ee4cc89ca/team

const helper = require('../helper');

async function init(accessToken, accessTokenAzure, groupID, groupName, tenantID) {
    let result = await helper.callApi(`https://graph.microsoft.com/beta/groups/${groupID}/team?$select=id,displayName,visibility`, accessToken)

    if (result == undefined) {
        return null
    }
    
    if (result) {
        return [{
            "file": 'team',
            "groupID": groupID,
            "groupName": groupName,
            "service": "Microsoft 365 Team",
            "resourceID": result.id,
            "name": result.displayName,
            "detailsGroup": `group '${groupName}'`,
            "details": `${result.visibility} team`
        }]
    } else {
        return []
    }
}


module.exports = { init }