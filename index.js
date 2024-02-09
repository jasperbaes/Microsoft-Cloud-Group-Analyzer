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
global.currentVersion = '2024.06'

// Declare libaries
require('dotenv').config();
var fs = require('fs');
const readline = require('readline');
const helper = require('./helper');

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

async function init(input) {
    console.log(`\n${fgColor.FgCyan}%s${colorReset}`, ' ## MICROSOFT CLOUD GROUP ANALYZER ##');
    console.log(` ${fgColor.FgGray}https://github.com/jasperbaes/Microsoft-Cloud-Group-Analyzer${colorReset}`)

    helper.onLatestVersion()
    
    // set global variables
    global.tenantID = process.env.TENANTID
    global.clientSecret = process.env.CLIENTSECRET
    global.clientID = process.env.CLIENTID

    let token = await helper.getToken() // get access token from Microsoft Graph API
    let tokenAzure = await helper.getTokenAzure() // get access token from Azure Service Management API
    
    // get script arguments
    global.scriptParameters = process.argv
    let parameterID = scriptParameters.slice(2); // get the third script parameter: node index.js xxxx-xxxx-xxxx-xxxx

    // if JSON file is specified, then open from JSON file. Else ask user input
    try {
        const indexO = process.argv.indexOf('-f');
        if (indexO !== -1 && indexO < process.argv.length - 1) {
            const parameterAfterO = process.argv[indexO + 1];
            const fileContent = JSON.parse(fs.readFileSync(`./${parameterAfterO}`, 'utf-8'))
            formatOutput(fileContent)
            helper.generateWebReport(fileContent)
        } else {
             if (token && input == undefined && parameterID?.length <= 0) { // if this function parameter 'input' is not provided, prompt the user
                getInput(token?.accessToken, tokenAzure?.accessToken, tenantID)
            } else if (token && input) { // if this function parameter 'input' is provided, continue
                handleInput(token?.accessToken, tokenAzure?.accessToken, input, tenantID)
            } else if (token && parameterID?.length > 0) { // if this script parameter is provided, continue with the first script parameter
                handleInput(token?.accessToken, tokenAzure?.accessToken, parameterID?.slice(0, 1), tenantID)
            }
        }
    } catch (error) {
        console.error(`ERROR: something went wrong opening JSON file`)
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
    rl.question(`\n Enter a group ID, a user ID or 'all': `, async (userInput) => {
        rl.close();
        handleInput(accessToken, accessTokenAzure, [userInput], tenantID)
    });
}

async function handleInput(accessToken, accessTokenAzure, groupID, tenantID) {
    // if user input is a userID, then add groups where user is member of to scope of the scan
    let isUser = await helper.callApi(`https://graph.microsoft.com/v1.0/users/${groupID[0]}?$select=id,userPrincipalName`, accessToken)
    if (isUser != undefined) {
        let groups = await helper.getAllWithNextLink(accessToken, `/v1.0/users/${groupID}/memberOf?$select=id`)
        groupID = groups.map(group => group.id)
    }

    // if user input is the word 'all', then add all Entra ID groups to scope of scan
    if (groupID == 'all') {
        let groups = await helper.getAllWithNextLink(accessToken, `/v1.0/groups?$select=id`)
        groupID = groups.map(group => group.id)
    }

    console.log(`\n Entra ID Groups in scope of this scan:`)
    groupsInScope = []

    // Loop over all groupIDs in scope of the scan
    for (let group of groupID) {
        let groupObject = await helper.callApi(`https://graph.microsoft.com/v1.0/groups/${group}?$select=id,displayName`, accessToken)

        // exit if the user input is invalid (not a group ID and not a user ID)
        if (groupObject == undefined && isUser == undefined) {
            console.log(`\n ERROR: No user/group found for ID '${group}'. Make sure the ID is correct and you have the correct permissions assigned. Exiting.`)
            process.exit()
        } else if (groupObject != undefined) { 
            // add each group to the scope of the scan
            console.log(` - '${groupObject.displayName}'`)
            groupsInScope.push({ groupID: groupObject.id, groupName: groupObject.displayName})

            // if any, add subgroups to the scope of the scan
            let memberOfOtherGroups = await require(`./service/groups`).init(accessToken, group, tenantID)
            memberOfOtherGroups.forEach(group => console.log(` - '${group.name}' ${fgColor.FgGray}(parent of '${groupObject.displayName}')${colorReset}`))
            groupsInScope.push(...memberOfOtherGroups.map(x => ({ groupID: x.resourceID, groupName: x.name}) ))
        }
    }
    
    // if input was a user ID, then also add that userID. This is required for the service 'azureResource'
    if (isUser != undefined) {
        groupsInScope.push({ groupID: isUser.id, groupName: isUser.userPrincipalName})
    }

    console.log(`\n This can take a while...`)
    calculateMemberships(accessToken, accessTokenAzure, groupsInScope, tenantID)
}

async function calculateMemberships(accessToken, accessTokenAzure, groupIDarray, tenantID) {
    let array = []

    // Log progress
    const progress = ((0) / groupIDarray.length) * 100; // Calculate progress percentage
    process.stdout.clearLine(); // Clear previous progress percentage
    process.stdout.cursorTo(0); // Move cursor to start of line
    process.stdout.write(` Progress: ${progress.toFixed(2)}% (${groupIDarray.length} group(s) remaining)`); // Display progress percentage

    // iterate over each groupID in scope
    for (let [index, group] of groupIDarray.entries()) {
        // iterate over each service
        for (let item of scope) {
            // if service is enabled in scope, then execute script and add result to an array
            if (item.enabled) {
                const serviceResult = await require(`./service/${item.file}`).init(accessToken, accessTokenAzure, group.groupID, group.groupName, tenantID);

                if (Array.isArray(serviceResult)) {
                    array.push(...serviceResult);
                }
            }
        
            // Log progress
            const progress = ((index + 1) / groupIDarray.length) * 100; // Calculate progress percentage
            process.stdout.clearLine(); // Clear previous progress percentage
            process.stdout.cursorTo(0); // Move cursor to start of line
            process.stdout.write(` Progress: ${progress.toFixed(2)}% (${groupIDarray.length - (index + 1)} group(s) remaining)`); // Display progress percentage
        }
    }

    console.log(`\n\n ---------------------------------------------`)
    
    // remove duplicated from this array
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
        console.log(' Error fetching above API endpoints. Verify you have all required permissions (https://github.com/jasperbaes/Microsoft-Cloud-Group-Analyzer#installation-and-usage)')
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