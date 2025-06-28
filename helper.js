const index = require('./index');
const axios = require('axios');
const msal = require('@azure/msal-node');
const NodeCache = require( "node-cache" );
const myCache = new NodeCache();
const identity = require('@azure/identity')
var fs = require('fs');
let converter = require('json-2-csv');
const path = require('path');

// express
try {
    const express = require('express')
    global.app = express()
    global.port = 3000
} catch (error) {
    console.log(` [${fgColor.FgRed}-${colorReset}] ERROR: 'Express' module not installed. Run 'npm install'`)
    process.exit() // exiting
}


global.forbiddenErrors = []

async function onLatestVersion() {
    // this function shows a message if the version of the tool equals the latest uploaded version in Github
    try {
        // fetch latest version from Github
        const response = await axios.default.get('https://raw.githubusercontent.com/jasperbaes/Microsoft-Cloud-Group-Analyzer/main/service/latestVersion.json');
        let latestVersion = response?.data?.latestVersion

        // if latest version from Github does not match script version, display update message
        if (response.data) {
            if (latestVersion !== currentVersion) {
                console.log(` [${fgColor.FgRed}-${colorReset}] ${fgColor.FgRed}update available!${colorReset} Run 'git pull' and 'npm install' to update from ${currentVersion} --> ${latestVersion}`)
            }
        }
    } catch (error) { // no need to log anything
    }
}

async function getToken() {
    // If the client secret is filled in, then get token from the Azure App Registration
    if (global.clientSecret && global.clientSecret.length > 0) {
        console.log(`\n [${fgColor.FgGray}i${colorReset}] Authenticating with App Registration...${colorReset}`)

        var msalConfig = {
            auth: {
                clientId: clientID,
                authority: 'https://login.microsoftonline.com/' + tenantID,
                clientSecret: clientSecret,
            }
        };

        const tokenRequest = {
            scopes: [
                'https://graph.microsoft.com/.default'
            ]
        };
        
        try {
            const cca = new msal.ConfidentialClientApplication(msalConfig);
            return await cca.acquireTokenByClientCredential(tokenRequest);
        } catch (error) {
            console.error(` [${fgColor.FgRed}X${colorReset}] Error retrieving access token from App Registration. Check the script variables in the .env file and App Registration permissions.${colorReset}\n\n`, error)
            process.exit()
        }
    } else {  // else get the token from the logged in user
        try {
            const credential = new identity.DefaultAzureCredential()
            let token
            
            try {
                token = await credential.getToken('https://graph.microsoft.com/.default')    
            } catch (error) {
                console.error(` [${fgColor.FgRed}X${colorReset}] Could not detect a logged in user with Graph permissions or the .env file. Exiting.`)
                process.exit()
            }
            
            let user = await callApi(`https://graph.microsoft.com/v1.0/me`, token.token) // fetch logged in user
            debugLogger(`${await user}`)

            if (user == undefined) { // if user not found or no permission, then exit
                console.error(` [${fgColor.FgRed}X${colorReset}] Error retrieving logged in session user. Exiting.`)
                process.exit()
            }

            console.log(` [${fgColor.FgGreen}✓${colorReset}] Authenticated with ${user?.userPrincipalName}${colorReset}`)

            return {accessToken: token.token}
        } catch (error) {
            console.error(` [${fgColor.FgRed}X${colorReset}] Error retrieving access token from logged in session user. Please check the user and permissions.${colorReset}\n\n`, error)
            process.exit()
        }
    }
}

async function getTokenAzure() {
    // If the client secret is filled in, then get token from the Azure App Registration
    if (global.clientSecret && global.clientSecret.length > 0) {
        var msalConfig2 = {
            auth: {
                clientId: clientID,
                authority: 'https://login.microsoftonline.com/' + tenantID,
                clientSecret: clientSecret,
            }
        };
        
        const cca = new msal.ConfidentialClientApplication(msalConfig2);

        const clientCredentialRequest = {
            scopes: ["https://management.core.windows.net/.default"],
        };

        return await cca.acquireTokenByClientCredential(clientCredentialRequest)
    } else {  // else get the token from the logged in user
        try {
            const credential = new identity.DefaultAzureCredential()
            let token = await credential.getToken('https://management.core.windows.net/.default')
            return {accessToken: token.token}
        } catch (error) {
            console.error(' ERROR: error while retrieving access token from logged in session user. Please check the script variables and permissions!\n\n', error)
            process.exit()
        }
    }
}

async function getAllWithNextLink(accessToken, urlParameter) {
    let arr = []
    let url = "https://graph.microsoft.com" + urlParameter

    try {
        do {
            let res =  await callApi(url, accessToken);
            let data = await res?.value
            url = res['@odata.nextLink']
            arr.push(...data)
        } while(url)
    } catch (error) {
    }

    return arr
}

async function callApi(endpoint, accessToken) { 
    // if the result is already in cache, then immediately return that result
    try {
        if (myCache.get(endpoint) != undefined) {
            debugLogger(`Returning local cache result for ${endpoint}`)
            return myCache.get(endpoint)
        }
    } catch (error) {
        console.error(` [${fgColor.FgRed}X${colorReset}] Error getting local cache.${colorReset}\n\n`, error)
    }
  

    const options = {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    };

    try {
        const response = await axios.default.get(endpoint, options);
        if (myCache.get(endpoint) == undefined) {
            myCache.set(endpoint, response.data, 120); // save to cache for 120 seconds
            debugLogger(`Result of ${endpoint} added to local cache`)
        }
        return response.data;
    } catch (error) {
        if (error.response && error.response.status == 403) {
            debugLogger(`403 error`, error.response?.data, error)
            global.forbiddenErrors.push(`${error?.response?.status} ${error?.response?.statusText} for '${error?.response?.config?.url}'`)
            // process.exit()
        }
        debugLogger(`ERROR: ${endpoint} ${error}`)
    }
};

async function exportJSON(arr, filename) { // export array to JSON file  in current working directory
    debugLogger(`Writing to ${filename}...`)
    fs.writeFile(filename, JSON.stringify(arr, null, 2), 'utf-8', err => {
        if (err) return console.error(` ERROR: ${err}`);
        console.log(` [${fgColor.FgGreen}✓${colorReset}] File '${filename}' successfully saved in current directory`)
    });
}

async function exportCSV(arr, filename) { // export array to CSV file in current working directory
    debugLogger(`Writing to ${filename}...`)
    const csv = await converter.json2csv(arr);

    fs.writeFile(filename, csv, err => {
        if (err) return console.error(` ERROR: ${err}`);
        console.log(` [${fgColor.FgGreen}✓${colorReset}] File '${filename}' successfully saved in current directory`)
    });
}

async function generateWebReport(arr) { // generates and opens a web report
    debugLogger(`Generating web report...`)

    // if --cli-only is specified, stop function
    if (scriptParameters.some(param => ['--cli-only', '-cli-only', '--clionly', '-clionly'].includes(param.toLowerCase()))) {
        debugLogger(`Detected the '--cli-only' parameter`)
        return; // stop function
    }

    // host files
    app.get('/style.css', function(req, res) { res.sendFile(__dirname + "/assets/" + "style.css"); });
    app.get('/AvenirBlack.ttf', function(req, res) { res.sendFile(__dirname + "/assets/fonts/" + "AvenirBlack.ttf"); });
    app.get('/AvenirBook.ttf', function(req, res) { res.sendFile(__dirname + "/assets/fonts/" + "AvenirBook.ttf"); });
    app.get('/logo.png', function(req, res) { res.sendFile(__dirname + "/assets/" + "logo.png"); });

    // host report page
    app.get('/', (req, res) => {
        let htmlContent = `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
              <link rel="stylesheet" href="style.css">
              <title>Microsoft Cloud Group Analyzer</title>
            </head>
            <body>
              <div class="container mt-4 mb-5">
                <p class="text-center"><a class="text-decoration-none" href="https://github.com/jasperbaes/Microsoft-Cloud-Group-Analyzer" target="_blank"><img src="logo.png" alt="Logo" height="160"></a><p>
                <h1 class="mb-0 text-center font-bold color-primary">Microsoft Cloud <span class="font-bold color-accent px-2 py-0">Group Analyzer</span></h1>
                <p class="text-center mt-3 mb-5 font-bold color-secondary">Track where your Entra Groups are used! 💪</p>
        `

        if (global.groupsInScope?.length > 0) {
            htmlContent += `
                <p class="text-center mt-5 mb-2 font-bold color-secondary">${global.groupsInScope?.length} group(s) in scope:</p>
            `
        }

        htmlContent += `<div style="display: flex; justify-content: center"> <ul>`

        // list groups in scope
        debugLogger(`Looping over each group in scope`)
        global.groupsInScope.forEach(group => {
            htmlContent += `<li>${group.groupName}</li>`;
        })
        
        htmlContent += '</ul></div> <p></p>';

        let printedServices = new Set();
        
        arr.sort((a, b) => {
            // First, sort by service
            const serviceComparison = a.service.localeCompare(b.service);
          
            // If services are equal, then sort by groupName
            if (serviceComparison === 0) {
              return a.groupName.localeCompare(b.groupName);
            }
          
            return serviceComparison;
          }).forEach(item => {
            // if the service is not yet evaluated for the first time, then print the service
            if (!printedServices.has(item.service)) {
                // Close the previous ul if it was opened
                if (printedServices.size > 0) {
                    htmlContent += '</ul></div>';
                }
                
                htmlContent += `
                    <div class="box mt-4 p-4">
                    <h3 class="mt-1"><span class="badge fs-2 font-bold color-accent px-2 py-2">${item.service}</span> <span class="fs-5 font-bold color-secondary">assignments:</span></h3>
                    <ul class="list-group list-group-flush ms-3 color-secondary">`;
                
                printedServices.add(item.service);
            }
        
            htmlContent += `
                <li class="list-group-item d-flex justify-content-between align-items-start color-secondary">
                    
                <div class="row align-items-center w-100">
                        <div class="col font-bold"> ${(item.groupName.includes('@')) ? 'user' : 'group'}: <span class="badge-blue font-bold color-primary px-2 py-0">${item.groupName}</span></div>
                        <div class="col font-bold">${item.name}</div>
                        <div class="col-3 text-end">${item.details}</div>
                    </div>
                </li>`;
        });
        
        // Close the last ul if it was opened
        if (printedServices.size > 0) {
            htmlContent += '</ul>';
        }
                  
        htmlContent += 
                `</ul>
              </div>
              <p class="text-center mt-5 mb-0"><a class="color-primary font-bold text-decoration-none" href="https://github.com/jasperbaes/Microsoft-Cloud-Group-Analyzer" target="_blank">Microsoft Cloud Group Analyzer</a>, made by <a class="color-accent font-bold text-decoration-none" href="https://www.linkedin.com/posts/jasper-baes_entraid-azure-activity-7157748584753319936-cqFX" target="_blank">Jasper Baes</a></p>
              <p class="text-center mt-1 mb-5"><a class="color-secondary" href="https://github.com/jasperbaes/Microsoft-Cloud-Group-Analyzer" target="_blank">https://github.com/jasperbaes/Microsoft-Cloud-Group-Analyzer</a></p>
            </body>
          </html>`;
        res.send(htmlContent);
      });

    app.listen(port, async () => {
        console.log(` ---------------------------------------------`)
        console.log(`\n [${fgColor.FgGreen}✓${colorReset}] Your web report is automatically opening on http://localhost:${port}`)

        try {
            debugLogger(`Opening web report...`)
            await require('open')(`http://localhost:${port}`);    
            console.log(` [${fgColor.FgGray}i${colorReset}] Use CTRL + C to exit.`)
        } catch (error) {
            console.error(` [${fgColor.FgRed}X${colorReset}] Error opening the web report\n\n`, error)
        }
    })
}

async function debugLogger(text) { 
    if (global.debugMode) {
        const logMessage = ` [${fgColor.FgGray}i${colorReset}] ${text}`;
        console.log(logMessage);
        fs.appendFile(global.logFilePath, `${logMessage}\n`, err => { 
            if (err) console.error(`Failed to write to log file: ${err.message}`); 
        });
    }
}

module.exports = { onLatestVersion, getToken, getTokenAzure, getAllWithNextLink, callApi, exportJSON, exportCSV, generateWebReport, debugLogger }
