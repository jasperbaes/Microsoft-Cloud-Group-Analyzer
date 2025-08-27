#!/usr/bin/env node

/*
======================================================================
Name: Microsoft Cloud Group Analyzer
Description: 
Author: Jasper Baes (https://www.linkedin.com/in/jasper-baes/)
Company: /
Published: January, 2023 
Dependencies: axios, msal-node, fs, readline, node-cache, json-2-csv
======================================================================
*/

// version of the tool
global.currentVersion = '2024.50'

// Declare libaries
require('dotenv').config();
var fs = require('fs');
const readline = require('readline');
const helper = require('./helper');
const path = require('path');

// Scope declaration. Change property 'enabled' to false to put service out of scope for the scan
let scope = [
    { file: 'groups', bgColor: '\x1b[41m', enabled: true},
    { file: 'roles', bgColor: '\x1b[41m', enabled: true},
    { file: 'app', bgColor: '\x1b[41m', enabled: true},
    { file: 'conditionalAccess', bgColor: '\x1b[41m', enabled: true},
    { file: 'enrollOSrestriction', bgColor: '\x1b[41m', enabled: true},
    { file: 'enrollLimitRestriction', bgColor: '\x1b[41m', enabled: true},
    { file: 'compliancePolicy', bgColor: '\x1b[41m', enabled: true},
    { file: 'configurationPolicies',  bgColor: '\x1b[41m', enabled: true},
    { file: 'configurationProfiles',  bgColor: '\x1b[41m', enabled: true},
    { file: 'deviceScript',  bgColor: '\x1b[41m', enabled: true},
    { file: 'appConfigurationPolicies', bgColor: '\x1b[41m', enabled: true},
    { file: 'appProtectionPolicy', bgColor: '\x1b[41m', enabled: true},
    { file: 'appAssignments', bgColor: '\x1b[41m', enabled: true},
    { file: 'windowsAutopilotDeploymentProfile', bgColor: '\x1b[41m', enabled: true},
    { file: 'mfaRegistration', bgColor: '\x1b[41m', enabled: true},
    { file: 'authenticationMethods', bgColor: '\x1b[41m', enabled: true},
    { file: 'team', bgColor: '\x1b[41m', enabled: true},
    { file: 'azureResource', bgColor: '\x1b[41m', enabled: true},
    { file: 'accessPackage', bgColor: '\x1b[41m', enabled: true},
    { file: 'accessPackageResource', bgColor: '\x1b[41m', enabled: true}
]

global.fgColor = {
    FgRed: "\x1b[31m",
    FgGreen: "\x1b[32m",
    FgYellow: "\x1b[33m",
    FgBlue: "\x1b[34m",
    FgMagenta: "\x1b[35m",
    FgCyan: "\x1b[36m",
    FgGray: "\x1b[90m",
}

global.colorReset = "\x1b[0m"
global.groupsInScope = []
global.debugMode = false
global.logFilePath = ''

async function init(input) {
    console.log(`\n${fgColor.FgCyan} ## MICROSOFT CLOUD GROUP ANALYZER ## ${colorReset}${fgColor.FgGray}v${currentVersion}${colorReset}`);
    console.log(` ${fgColor.FgGray}Created by Jasper Baes - https://github.com/jasperbaes/Microsoft-Cloud-Group-Analyzer${colorReset}`)

    helper.onLatestVersion()

    // get script arguments
    global.scriptParameters = process.argv
    let parameterID = scriptParameters.slice(2); // get the third script parameter: node index.js xxxx-xxxx-xxxx-xxxx

    //  debug mode
    const debugParameter = scriptParameters.findIndex(param => ['-d', '--debug'].includes(param.toLowerCase()));
    if (debugParameter !== -1) {
        helper.debugLogger(`Enabeling debug mode...`);
        global.debugMode = true;
        
        // Create a log file with the current datetime in the filename
        helper.debugLogger(`Creating log file...`);
        global.logFilePath = path.join(process.cwd(), `debug-log-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`);
    }
    
    // set global variables
    global.tenantID = process.env.TENANTID
    global.clientSecret = process.env.CLIENTSECRET
    global.clientID = process.env.CLIENTID

    let token = await helper.getToken() // get access token from Microsoft Graph API
    helper.debugLogger(JSON.stringify(token))
    let tokenAzure = await helper.getTokenAzure() // get access token from Azure Service Management API
    helper.debugLogger(JSON.stringify(tokenAzure))

    // if JSON file is specified, then open from JSON file. Else ask user input
    try {
        const indexO = process.argv.indexOf('-f');
        if (indexO !== -1 && indexO < process.argv.length - 1) {
            helper.debugLogger(`Detected the -f parameter`);
            const parameterAfterO = process.argv[indexO + 1];
            helper.debugLogger(`Reading file ${parameterAfterO}`);
            const fileContent = JSON.parse(fs.readFileSync(`./${parameterAfterO}`, 'utf-8'))
            helper.debugLogger(`Formatting the file...`);
            formatOutput(fileContent)
            helper.generateWebReport(fileContent)
        } else {
             if (token && input == undefined && parameterID?.length <= 0) { // if this function parameter 'input' is not provided, prompt the user
                getInput(token?.accessToken, tokenAzure?.accessToken, tenantID)
            } else if (token && input) { // if this function parameter 'input' is provided, continue
                let groupObject = await helper.callApi(`https://graph.microsoft.com/v1.0/groups/${input[0]}?$select=id,displayName`, token?.accessToken)
                handleInput(token?.accessToken, tokenAzure?.accessToken, [{id: input[0], displayName: groupObject.displayName}], tenantID)
            } else if (token && parameterID?.length > 0) { // if this script parameter is provided, continue with the first script parameter
                let groupObject = await helper.callApi(`https://graph.microsoft.com/v1.0/groups/${parameterID?.slice(0, 1)[0]}?$select=id,displayName`, token?.accessToken)
                handleInput(token?.accessToken, tokenAzure?.accessToken,  [{id: parameterID?.slice(0, 1)[0], displayName: groupObject?.displayName}], tenantID)
            }
        }
    } catch (error) {
        console.error(`ERROR: something went wrong opening JSON file`, error)
    }   
}

init()
// init(['xxxxxx-xxxxxx-xxxxxxx-xxxxxx']) // The init function can be called directly - also from another file - with an array of groupIDs, an array of 1 userID or the word 'all'

async function getInput(accessToken, accessTokenAzure, tenantID) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Get input 'groupID' from the user via terminal
    helper.debugLogger(`Asking user input`)
    rl.question(`\n Enter a group ID, a user ID or 'all': `, async (userInput) => {
        rl.close();
        handleInput(accessToken, accessTokenAzure, [{id: userInput}], tenantID)
    });
}

async function handleInput(accessToken, accessTokenAzure, groupID, tenantID) {
    // if user input is a userID, then add groups where user is member of to scope of the scan
    helper.debugLogger(`Fetching the user ID and UPN...`)
    let isUser = await helper.callApi(`https://graph.microsoft.com/v1.0/users/${groupID[0]?.id}?$select=id,userPrincipalName`, accessToken)
    if (isUser != undefined) {
        helper.debugLogger(`Fetching the groups of this user...`)
        let groups = await helper.getAllWithNextLink(accessToken, `/v1.0/users/${groupID[0]?.id}/memberOf?$select=id,displayName`)
        groupID = groups.map(group => ({ id: group.id, displayName: group.displayName }))        
    }

    // if user input is the word 'all', then add all Entra groups to scope of scan
    if (groupID[0]?.id == 'all') {
        helper.debugLogger(`Fetching all groups...`)
        let groups = await helper.getAllWithNextLink(accessToken, `/v1.0/groups?$select=id,displayname`)
        groupID = groups.map(group => ({ id: group.id, displayName: group.displayName }))
    }

    console.log(`\n Entra Groups in scope of this scan:`)

    // Loop over all groupIDs in scope of the scan
    for (let group of groupID) {
        helper.debugLogger(`Fetching group ID and group name...`)
        
        // add group to scope
        console.log(` - '${group.displayName}'`)
        helper.debugLogger(`Adding group to scope...`)
        global.groupsInScope.push({ groupID: group.id, groupName: group.displayName})

        // also add subgroups to scope of this scan
        let memberOfOtherGroups = await require(`./service/groups`).init(accessToken, group.id, tenantID)
        memberOfOtherGroups.forEach(parentGroup => console.log(` - '${parentGroup.name}' ${fgColor.FgGray}(parent of '${group.displayName}')${colorReset}`))
        global.groupsInScope.push(...memberOfOtherGroups.map(x => ({ groupID: x.resourceID, groupName: x.name}) ))
        
        // limit parameter
        const limitIndex = scriptParameters.findIndex(param => ['-l', '--limit'].includes(param.toLowerCase()));
        if (limitIndex !== -1 && limitIndex + 1 < scriptParameters.length) {
            const limitValue = scriptParameters[limitIndex + 1];

            if (global.groupsInScope.length >= limitValue) {
                helper.debugLogger(`Limiting scope to first ${limitValue} groups...`)
                global.groupsInScope = global.groupsInScope.slice(0, limitValue)
                console.log(`\n [${fgColor.FgGreen}✓${colorReset}] Limiting scope to first ${limitValue} group(s)`);
                break
            }
        }
    }
    
    // if input was a user ID, then also add that userID. This is required for the service 'azureResource'
    if (isUser != undefined) {
        helper.debugLogger(`Adding user ID to the scope (used for Azure resources)`)
        global.groupsInScope.push({ groupID: isUser.id, groupName: isUser.userPrincipalName})
    }

    console.log(` [${fgColor.FgGreen}✓${colorReset}] ${global.groupsInScope.length} Entra group(s) in scope`)

    // skip parameter
    const skipIndex = scriptParameters.findIndex(param => ['-s', '--skip'].includes(param.toLowerCase()));
    if (skipIndex !== -1 && skipIndex + 1 < scriptParameters.length) {
        const skipValue = scriptParameters[skipIndex + 1];
        helper.debugLogger(`Skiping scope with ${skipValue} groups...`)
        global.groupsInScope = global.groupsInScope.slice(skipValue)
        console.log(` [${fgColor.FgGreen}✓${colorReset}] Skipping scope with ${skipValue} group(s)`);
    }

    console.log(` [${fgColor.FgGray}i${colorReset}] Calculating Entra group assignments...`)
    calculateMemberships(accessToken, accessTokenAzure, global.groupsInScope, tenantID)
}

async function calculateMemberships(accessToken, accessTokenAzure, groupIDarray, tenantID) {
    let array = [];

// Function to log progress
const logProgress = (index, total) => {
    const progress = ((index + 1) / total) * 100;
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(` [${fgColor.FgGray}i${colorReset}] Progress: ${progress.toFixed(2)}% (${total - (index + 1)} group(s) remaining)`);
};

// Process groups in batches
const processGroupsInBatches = async (groupIDarray, scope, accessToken, accessTokenAzure, tenantID, batchSize = 10) => {
    for (let i = 0; i < groupIDarray.length; i += batchSize) {
        const batch = groupIDarray.slice(i, i + batchSize);
        const promises = batch.map(async (group, index) => {
            const servicePromises = scope.map(async (item) => {
                if (item.enabled) {
                    const serviceResult = await require(`./service/${item.file}`).init(accessToken, accessTokenAzure, group.groupID, group.groupName, tenantID);
                    if (Array.isArray(serviceResult)) {
                        array.push(...serviceResult);
                    }
                }
            });

            // Wait for all services to complete for the current group
            await Promise.all(servicePromises);

            // Log progress at regular intervals
            if ((i + index) % 10 === 0 || (i + index) === groupIDarray.length - 1) {
                logProgress(i + index, groupIDarray.length);
            }
        });

        // Wait for the current batch to be processed
        await Promise.all(promises);
    }

    console.log(`\n [${fgColor.FgGreen}✓${colorReset}] Scan completed`);
    };

    // Example usage
    await processGroupsInBatches(groupIDarray, scope, accessToken, accessTokenAzure, tenantID);

    // console.log(`\n [${fgColor.FgGreen}✓${colorReset}] Scan completed`)
    console.log(`\n ---------------------------------------------`)
    
    // remove duplicated from this array
    helper.debugLogger(`Filtering for unique results only...`)
    const uniqueArray = array.filter((value, index, self) =>
        index === self.findIndex((t) => (
            t.file === value.file &&
            t.groupID === value.groupID &&
            t.resourceID === value.resourceID &&
            t.details === value.details
        ))
    );

    // remove duplicated from error array
    const uniqueErrorArray = [...new Set(global.forbiddenErrors)]

    if (uniqueErrorArray.length > 0) {
        console.log(`\n ${uniqueErrorArray.length} ERROR(S):`)
        console.log(' ', uniqueErrorArray)
        console.error(` [${fgColor.FgRed}X${colorReset}] Error fetching above API endpoints. Verify you have all required permissions (https://github.com/jasperbaes/Microsoft-Cloud-Group-Analyzer#installation-and-usage)`)
    }
    
    formatOutput(array)
    helper.generateWebReport(array)
}

async function formatOutput(arr) {
    // this set is used to track which services are already printed
    let printedServices = new Set();

    arr.sort((a, b) => a.service.localeCompare(b.service)).forEach(item => {
        // if the service is not yet evaluated for the first time, then print the service
        if (!printedServices.has(item.service)) {
            const randomColor = scope.find(x => x.file == item.file)?.bgColor
            console.log(`\n${randomColor} ${item.service} ${colorReset} assignments:`);
            printedServices.add(item.service);
        }

        // if the item has the property 'details', then also print that property
        let detailString = item.details ? ` ${fgColor.FgGray}(${item.detailsGroup} -- ${item.details})${colorReset}` : ` ${fgColor.FgGray}(${item.detailsGroup})${colorReset}`;
        console.log(` - ${item.name}${detailString}`);
    });

    console.log(`\n`)

    // export results
    const today = new Date().toISOString().slice(0, 10); // Get today's date in YYYY-MM-DD format
    try {
        if (scriptParameters.some(param => ['--export-json', '-export-json', '--exportjson', '-exportjson'].includes(param.toLowerCase()))) {
            await helper.exportJSON(arr, `${today}-Cloud-Analyzer-export.json`)
        } 
        if (scriptParameters.some(param => ['--export-csv', '-export-csv', '--exportcsv', '-exportcsv'].includes(param.toLowerCase()))) {
            await helper.exportCSV(arr, `${today}-Cloud-Analyzer-export.csv`)
        }
    } catch (error) {
        console.error(`ERROR: something went wrong exporting to JSON and/or CSV`)
    }
}

module.exports = { }