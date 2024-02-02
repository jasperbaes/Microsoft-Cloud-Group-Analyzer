const helper = require('../helper');

async function init(accessToken, accessTokenAzure, groupID, groupName, tenantID) {
    let subscriptions = await helper.callApi(`https://management.azure.com/subscriptions?api-version=2020-01-01`, accessTokenAzure)

    // if cannot find subscriptions or has no subsriptions
    if (subscriptions == undefined) {
        forbiddenErrors.push(`Error fetching subscriptions`)
        return null
    } else if (subscriptions?.value?.length == 0) {
        forbiddenErrors.push(`No Azure subscriptions found`)
        return null
    }

    let array = []
    let counter = 1

    var promise = new Promise((resolve, reject) => {
        subscriptions?.value?.forEach(async subscription => {
            let roleAssignments = await helper.callApi(`https://management.azure.com/subscriptions/${subscription.subscriptionId}/providers/Microsoft.Authorization/roleAssignments?api-version=2022-04-01`, accessTokenAzure)
            
            if (roleAssignments) {
                roleAssignments = roleAssignments?.value?.filter(roleAssignment => roleAssignment?.properties?.principalId == groupID).forEach(res => {
                    if (res.properties.scope.length > 1) { // don't show if scope is empty. If scope is empty, it is the RoleAssignment object. No need to show that again
                        array.push({
                            "file": 'azureResource',
                            "groupID": groupID,
                            "service": "Azure Resource",
                            "resourceID": res.id,
                            "name": res?.properties?.scope.substring(res?.properties?.scope.lastIndexOf('/') + 1), // take the resource name from the scope
                            "details": `${(groupName.includes('@')) ? 'user' : 'group'} '${groupName}'`
                        })
                    }
                })
            }

            if (subscriptions?.value?.length == counter) resolve()
            counter++
        });
    })

    return promise.then(() => {
        return array
    })
}


module.exports = { init }