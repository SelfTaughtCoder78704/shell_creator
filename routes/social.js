const passport = require('passport');
const express = require('express');
const router = express.Router();
const ensureAuthenticated = require('../config/auth').ensureAuthenticated;
const { google } = require('googleapis');
const process = require('process');
const User = require('../models/user-model');


// Route for Google authentication
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email', "https://www.googleapis.com/auth/drive"],
    accessType: 'offline'
  }));


// Callback route for Google to redirect to after authentication
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/users/login' }),
  function (req, res) {
    res.redirect('/auth/drive-files');
  });


router.get('/drive-files', ensureAuthenticated, setAuthClient, async (req, res) => {
  const drive = google.drive({ version: 'v3', auth: req.authClient });
  drive.files.list({
    pageSize: 100,
    q: "mimeType='image/jpeg' or mimeType='image/png' or mimeType='image/gif'",
    fields: 'nextPageToken, files(id, name)',
  }, (err, response) => {
    if (err) return console.log(`The API returned an error: ${err}`);
    const files = response.data.files;
    if (files.length) {
      console.log('Files:');
      files.map((file) => {
        console.log(`${file.name} (${file.id})`);
      });
      res.render('drive', { user: req.user, files: files });
    } else {
      console.log('No files found.');
    }
  });
});

const mimeTypes = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
};

router.get('/download/:id', ensureAuthenticated, setAuthClient, async (req, res) => {
  console.log('requesting file' + " " + req.params.id)
  const fileId = req.params.id;
  await downloadFile(fileId, req, res);
});


async function downloadFile(realFileId, req, res) {
  const drive = google.drive({ version: 'v3', auth: req.authClient });
  let fileId = realFileId;
  try {
    const file = await drive.files.get({
      fileId: fileId,
      alt: 'media',
    }, { responseType: 'stream' });
    let fType = file.headers['content-type'];
    let generatedFileName = `${fileId}.${mimeTypes[fType]}`;
    res.set('Content-Disposition', `attachment; filename="${fileId}.${mimeTypes[fType]}"`)
    res.set('Content-Type', fType);
    console.log(`Downloaded ${realFileId} to ${generatedFileName}`);
    file.data.pipe(res);
  } catch (err) {
    console.error(err);
    throw err;
  }
}

async function setAuthClient(req, res, next) {
  const user = await User.findOne({ email: req.user.email });
  const authClient = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI
  );
  authClient.setCredentials({
    refresh_token: user.refreshToken,
    access_token: user.accessToken,
    token_type: 'Bearer',
    expiry_date: user.expiryDate,
  });
  req.authClient = authClient;
  next();
}


module.exports = router;
