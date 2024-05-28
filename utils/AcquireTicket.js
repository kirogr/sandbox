const dotenv = require('dotenv');
dotenv.config();
const https = require('https');
const fetch = require('node-fetch');
const fs = require('fs');
const cheerio = require('cheerio');

const auth = Buffer.from(`${process.env.ESXI_USERNAME}:${process.env.ESXI_PASSWORD}`).toString('base64');
const basicAuthHeader = `Basic ${auth}`;

const caCert = fs.readFileSync('C:\\Users\\User\\Desktop\\sandbox\\castore.pem');

const httpsAgent = new https.Agent({
  ca: caCert
});

// Function to acquire ticket
async function acquireTicket(vmId) {
    const esxiHost = process.env.ESXI_HOST;
    const esxiPath = `/mob/?moid=${vmId}&method=acquireTicket`;
    console.log(esxiPath);
  try {
    const responseGet = await fetch(`https://${esxiHost}${esxiPath}`, {
      method: 'GET',
      headers: {
        'Authorization': basicAuthHeader
      },
      agent: httpsAgent
    });

    console.log(responseGet.text.name);

    if (!responseGet.ok) {
      throw new Error(`HTTP error! Status: ${responseGet.status}`);
    }

    var html = await responseGet.text();
    var $ = cheerio.load(html);
    var csrfToken = $('input[name="vmware-session-nonce"]').attr('value');
    var cookies = responseGet.headers.raw()['set-cookie'];

    const responsePost = await fetch(`https://${esxiHost}${esxiPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': basicAuthHeader,
        'Cookie': cookies.join(';')
      },
      body: `vmware-session-nonce=${csrfToken}&ticketType=webmks`,
      agent: httpsAgent
    });

    if (!responsePost.ok) {
      throw new Error(`HTTP error! Status: ${responsePost.status}`);
    }

    data = await responsePost.text();
    $ = cheerio.load(data);
    const ticketField = $('span[onclick^="showHideSecretField"]');
    if (!ticketField.length) {
        throw new Error('Ticket field not found in the response HTML');
      }

    const onclickAttribute = ticketField.attr('onclick');
    const ticketId = onclickAttribute.match(/"([^&]+)"/)[1];
  
    return ticketId;
} catch (error) {
    console.error('Error:', error.message);
    return error.message;
  }
}

module.exports.AcquireTicket = acquireTicket;
