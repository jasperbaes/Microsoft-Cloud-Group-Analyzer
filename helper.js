const index = require('./index');
const axios = require('axios');
const msal = require('@azure/msal-node');
const NodeCache = require( "node-cache" );
const myCache = new NodeCache();
const identity = require('@azure/identity')

// express
const express = require('express')
const app = express()
const port = 3000

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
                console.log(` ${fgColor.FgRed}- update available!${fgColor.FgGray} Run 'git pull' to update from ${currentVersion} --> ${latestVersion}${colorReset}`)
            }
        }
    } catch (error) { // no need to log anything
    }
}

async function getToken() {
    // If the client secret is filled in, then get token from the Azure App Registration
    if (global.clientSecret && global.clientSecret.length > 0) {
        console.log(` ${fgColor.FgGray}- authenticated with app registration${colorReset}`)

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
            console.error(' ERROR: error while retrieving access token from app registration. Please check the script variables and permissions!\n\n', error)
            process.exit()
        }
    } else {  // else get the token from the logged in user
        try {
            const credential = new identity.DefaultAzureCredential()
            let token
            
            try {
                token = await credential.getToken('https://graph.microsoft.com/.default')    
            } catch (error) {
                console.error(`\n ERROR: seems like you're not logged in. Exiting.\n`)
                process.exit()
            }
            
            let user = await callApi(`https://graph.microsoft.com/v1.0/me`, token.token) // fetch logged in user

            if (user == undefined) { // if user not found or no permission, then exit
                console.error('\n ERROR: error while retrieving logged in session user. Exiting.\n')
                process.exit()
            }

            console.log(` ${fgColor.FgGray}- authenticated with ${user?.userPrincipalName}${colorReset}`)

            return {accessToken: token.token}
        } catch (error) {
            console.error(' ERROR: error while retrieving access token from logged in session user. Please check the user and permissions!\n\n', error)
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
    if (myCache.get(endpoint) != undefined) {
        return myCache.get(endpoint)
    }

    const options = {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    };

    try {
        const response = await axios.default.get(endpoint, options);
        if (myCache.get(endpoint) == undefined) myCache.set(endpoint, response.data, 120); // save to cache for 120 seconds
        return response.data;
    } catch (error) {
        if (error.response.status == 403) {
        // if (error.response.status == 403 || error.response.status == 400) { // include 400 response for development
            console.log(error.response?.data)
            // process.exit()
            global.forbiddenErrors.push(`${error?.response?.status} ${error?.response?.statusText} for '${error?.response?.config?.url}'`)
        }
    }
};

async function exportJSON(arr, filename) { // export array to JSON file  in current working directory
    fs.writeFile(filename, JSON.stringify(arr, null, 2), 'utf-8', err => {
        if (err) return console.error(` ERROR: ${err}`);
        console.log(` File '${filename}' successfully saved in current directory`);
    });
}

async function exportCSV(arr, filename) { // export array to CSV file in current working directory
    const csv = await converter.json2csv(arr);

    fs.writeFile(filename, csv, err => {
        if (err) return console.error(` ERROR: ${err}`);
        console.log(` File '${filename}' successfully saved in current directory`);
    });
}

async function generateWebReport(arr) { // generates and opens a web report

    app.get('/style.css', function(req, res) {
        res.sendFile(__dirname + "/assets/" + "style.css");
    });

    app.get('/AvenirBlack.ttf', function(req, res) {
        res.sendFile(__dirname + "/assets/fonts/" + "AvenirBlack.ttf");
    });

    app.get('/AvenirBook.ttf', function(req, res) {
        res.sendFile(__dirname + "/assets/fonts/" + "AvenirBook.ttf");
    });

    app.get('/logo.png', function(req, res) {
        res.sendFile(__dirname + "/assets/" + "logo.png");
    });

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
                <p class="text-center"><img src="logo.png" alt="Logo" height="160"><p>
                <h1 class="mb-5 text-center font-bold color-primary">Microsoft Cloud <span class="font-bold color-accent px-3 py-1">Group Analyzer</span></h1>`
        
        let printedServices = new Set();
        
        arr.sort((a, b) => a.service.localeCompare(b.service)).forEach(item => {
            // if the service is not yet evaluated for the first time, then print the service
            if (!printedServices.has(item.service)) {
                // Close the previous ul if it was opened
                if (printedServices.size > 0) {
                    htmlContent += '</ul></div>';
                }
                
                htmlContent += `
                    <div class="box mt-4 p-4">
                    <h3 class="mt-1"><span class="badge fs-2 font-bold color-accent px-3 py-2">${item.service}</span> <span class="fs-5 font-bold color-secondary">assignments:</span></h3>
                    <ul class="list-group list-group-flush ms-3 color-secondary">`;
                
                printedServices.add(item.service);
            }
        
            // if the item has the property 'details', then also print that property
            htmlContent += `
                <li class="list-group-item d-flex justify-content-between align-items-start color-secondary">
                    
                <div class="row align-items-start w-100">
                        <div class="col-3 font-bold">${item.groupName}</div>
                        <div class="col font-bold color-primary">${item.name}</div>
                        <div class="col">${item.details}</div>
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
              <p class="text-center mt-3 mb-0">made by <a class="color-accent font-bold text-decoration-none" href="https://www.linkedin.com/in/jasper-baes/" target="_blank">Jasper Baes</a></p>
              <p class="text-center mt-1 mb-5"><a class="color-secondary" href="https://github.com/jasperbaes/Microsoft-Cloud-Group-Analyzer" target="_blank">https://github.com/jasperbaes/Microsoft-Cloud-Group-Analyzer</a></p>
            </body>
          </html>`;
        res.send(htmlContent);
      });

    app.listen(port, async () => {
        console.log(`\n Your web report is automatically opening on http://localhost:${port}`)
        await require('open')(`http://localhost:${port}`);
    })
}

module.exports = { onLatestVersion, getToken, getTokenAzure, getAllWithNextLink, callApi, exportJSON, exportCSV, generateWebReport }