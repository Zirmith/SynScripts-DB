const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Config } = require('./config.js');

const app = express();
const router = express.Router();
const firstpoint = Config.System.hostpoint;
const api_name = Config.System.name;
const port = Config.System.port;

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
      const script = { userid, scriptId, scriptText };
      scripts.push(script);
      // Generate URL for script
      const scriptUrl = `${firstpoint}users/${userid}/scripts/raw/${scriptId}`;
      res.status(201).json({ url: scriptUrl });
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
          userid: script.userid,
          scriptId: script.scriptId,
          createdOn: script.createdOn,
          lastModifiedOn: script.lastModifiedOn
        };
        return res.status(200).json({
          metadata,
          script: scriptText
        });
      } else {
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(scriptText);
      }
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal server error');
    }
  });
  
  
  app.use('/', (req, res) => {
    res.send({online: true})
  })

  app.use('/status', (req, res) => {
    res.send({
        api: {
            ['User Server']: "Online",
            ['Script Server']: "Online",
            ['Database Server']: "Half Working"
        }
    })
  })
  
app.use(firstpoint, router);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
