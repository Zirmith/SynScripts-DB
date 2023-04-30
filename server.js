const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Config } = require('./config.js');
const axios = require('axios');
require('dotenv').config()
const app = express();
const router = express.Router();
const firstpoint = Config.System.hostpoint;
const api_name = Config.System.name;
const port = Config.System.port;
const WEBHOOK_ID = process.env.WEBID
const WEBHOOK_TOKEN = process.env.WEBTOKEN
console.log('firstpoint:', firstpoint); // Debugging statement

app.use(cors());
app.use(bodyParser.json());

const crypto = require('crypto');

const users = [];
const scripts = [];

router.post('/users/register', async (req, res) => {
  try {
    const { userid } = req.body;

    // Check if user already exists
    const existingUser = users.find((user) => user.userid === userid);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Generate authentication token
    const token = crypto.randomBytes(32).toString('hex');

    // Save user to database
    const user = { userid, token };
    users.push(user);

    // Return authentication token
    res.status(201).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal server error');
  }
});

router.post('/users/login', async (req, res) => {
  try {
    const { userid, token } = req.body;
    // Verify user token
    const existingUser = users.find((user) => user.userid === userid && user.token === token);
    if (!existingUser) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Set user as logged in
    existingUser.logged = true;
    res.status(200).json({ message: 'Login successful' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal server error');
  }
});

router.post('/users/logout', async (req, res) => {
    try {
      const { userid, token } = req.body;
      // Verify user token
      const existingUser = users.find((user) => user.userid === userid && user.token === token);
      if (!existingUser) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      // Set user as logged out
      existingUser.logged = false;
      res.status(200).json({ message: 'Logout successful' });
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal server error');
    }
  });
  


  router.post('/users/:userid/scripts/upload', async (req, res) => {
    try {
      const { userid } = req.params;
      const { token, scriptText, originalname } = req.body;
      const allowedExtensions = /(\.lua)$/i; // regex to match .lua extensions
  
      // Check if file has allowed extension
      if (!allowedExtensions.test(originalname)) {
        return res.status(400).json({ error: 'Invalid file type, only .lua files are allowed' });
      }
  
      // Verify user is logged in
      const existingUser = users.find((user) => user.userid === userid && user.token === token && user.logged);
      if (!existingUser) {
        return res.status(401).json({ error: 'User not logged in' });
      }
      // Upload script
      const scriptId = crypto.randomBytes(16).toString('hex');
      // Save script to database
      const script = { userid, scriptId, scriptText, createdOn: Date.now(),
        lastModifiedOn: Date.now() };
      scripts.push(script);
      // Generate URL for script
      const scriptUrl = `https://synscripts.onrender.com${firstpoint}users/${userid}/scripts/raw/${scriptId}`;
      res.status(201).json({ url: scriptUrl });
  
      // Send webhook to Discord
      const webhookUrl = `https://discord.com/api/webhooks/${WEBHOOK_ID}/${WEBHOOK_TOKEN}`; // Replace with your webhook URL
      const username = 'Script Logger'; // Replace with the username you want the webhook message to have
      const message = `New script uploaded by user ${userid}: ${scriptUrl}`; // Customize the message content
      await axios.post(webhookUrl, { username, content: message });
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal server error');
    }
  });
  
  
  
  router.get('/users/:userid/scripts/raw/:scriptId', async (req, res) => {
    try {
      const { userid, scriptId } = req.params;
      // Find script in database
      const script = scripts.find((s) => s.userid === userid && s.scriptId === scriptId);
      if (!script) {
        return res.status(404).send('Script not found');
      }
      const scriptText = script.scriptText;
      if (req.headers.accept === 'application/json') {
        const metadata = {
          scriptId: script.scriptId,
        };
        return res.status(200).json({
          metadata,
          script: scriptText
        });
      } else {
        const title = `Script ${scriptId} by ${userid} | Code Hosting`;
        const description = `View and share ${userid}'s Lua script ${scriptId} on ${api_name}. Uploaded on ${script.createdOn}. Last modified on ${script.lastModifiedOn}.`;
        const style = `
          body {
            background-color: #1e1e1e;
            color: #d4d4d4;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          .container {
            margin: 50px auto;
            max-width: 1000px;
            padding: 20px;
            border: 1px solid #2b2b2b;
            border-radius: 5px;
            box-shadow: 0px 2px 5px 0px rgba(0, 0, 0, 0.5);
          }
          h1 {
            text-align: center;
            font-size: 36px;
            margin-bottom: 30px;
          }
          .editor {
            height: 600px;
            margin-bottom: 20px;
            border: 1px solid #2b2b2b;
            border-radius: 5px;
          }
          .mdl-button {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 16px;
            color: #fff;
            background-color: #0275d8;
            border: none;
            border-radius: 5px;
            padding: 10px 20px;
            margin-top: 20px;
            box-shadow: 0px 2px 5px 0px rgba(0, 0, 0, 0.5);
            cursor: pointer;
          }
          .mdl-button:hover {
            background-color: #025aa5;
          }
          .mdl-button:focus {
            outline: none;
          }
          .mdl-button:active {
            box-shadow: none;
            transform: translateY(2px);
          }
        `;
        const html = `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <meta name="robots" content="noindex, nofollow" />
              <meta property="og:title" content="${title}" />
              <meta property="og:description" content="${description}" />
              <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/ace.js"></script>
              <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
              <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
              <link rel="stylesheet" href="https://code.getmdl.io/1.3.0/material.blue_grey-blue.min.css" />
              <script defer src="https://code.getmdl.io/1.3.0/material.min.js"></script>
            </head>
            <body>
              <div class="container">
                <div id="editor" class="editor"></div>
                <button id="copy-button" class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect">
                  <i class="material-icons">content_copy</i> Copy to Clipboard
                </button>
              </div>
            </body>
            <style>${style}</style>
            <script>
              const editor = ace.edit("editor");
              editor.setTheme("ace/theme/tomorrow_night_eighties");
              editor.session.setMode("ace/mode/lua");
              editor.setValue(${JSON.stringify(scriptText)});
              const copyButton = document.getElementById("copy-button");
              copyButton.addEventListener("click", () => {
                navigator.clipboard.writeText(editor.getValue());
              });
            </script>
          </html>
        `;
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
        
      }
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal server error');
    }
  });
  
  
  app.get('/', (req, res) => {
    res.send({online: true})
  })

  app.get('/status', (req, res) => {
    const title = 'API Status';
    const description = 'Check the status of our servers here';
    const status = {
      ['User Server']: 'Online',
      ['Script Server']: 'Online',
      ['Database Server']: 'Half Working',
    };
  
    const css = `
      body {
        background-color: #282c34;
        font-family: Arial, Helvetica, sans-serif;
        color: #fff;
        margin: 0;
        padding: 0;
      }
  
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 40px;
      }
  
      h1 {
        text-align: center;
        margin-top: 0;
      }
  
      .status {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        margin-top: 40px;
      }
  
      .status-item {
        flex-basis: 30%;
        text-align: center;
        padding: 20px;
        background-color: #1f2227;
        border-radius: 10px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
      }
  
      .status-item h2 {
        margin-top: 0;
      }
    `;
  
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta name="robots" content="noindex, nofollow" />
          <meta property="og:title" content="${title}" />
          <meta property="og:description" content="${description}" />
          <style>${css}</style>
        </head>
        <body>
          <div class="container">
            <h1>${title}</h1>
            <p>${description}</p>
            <div class="status">
              ${Object.entries(status)
                .map(([name, value]) => `
                  <div class="status-item">
                    <h2>${name}</h2>
                    <p>${value}</p>
                  </div>
                `)
                .join('')}
            </div>
          </div>
        </body>
      </html>
    `;
  
    res.send(html);
  });
  
app.use(firstpoint, router);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
