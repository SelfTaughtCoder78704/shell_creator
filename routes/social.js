const passport = require('passport');
const express = require('express');
const router = express.Router();
const ensureAuthenticated = require('../config/auth').ensureAuthenticated;
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
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

    console.log('user ' + req.user)
    res.redirect('/auth/drive-files');
  });


router.get('/drive-files', ensureAuthenticated, async (req, res) => {

  const user = await User.findOne({ email: req.user.email })

  const authClient = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI
  );

  authClient.setCredentials({
    refresh_token: user.refreshToken,
    access_token: user.accessToken,
    token_type: 'Bearer',
    expiry_date: Date.now() + 1000 * 60 * 60,
  });
  const drive = google.drive({ version: 'v3', auth: authClient });

  drive.files.list({
    pageSize: 100,
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


// router.get('/download/:id', ensureAuthenticated, async (req, res) => {
//   const user = await User.findOne({ email: req.user.email })
//   const localPath = path.join(__dirname, 'downloads');

//   console.log('requesting file' + " " + req.params.id)
//   const fileId = req.params.id;
//   const theFiles = await downloadFileSaveToFiles(fileId, user, localPath);
//   res.json({ theFiles });
// });
// ********************************************************************
// the above route will work with the code below to save to local files
// ********************************************************************

// async function downloadFileSaveToFiles(realFileId, user, localPath) {
//   const authClient = new google.auth.OAuth2(
//     process.env.GOOGLE_CLIENT_ID,
//     process.env.GOOGLE_CLIENT_SECRET,
//     process.env.REDIRECT_URI
//   );

//   authClient.setCredentials({
//     refresh_token: user.refreshToken,
//     access_token: user.accessToken,
//     token_type: 'Bearer',
//     expiry_date: Date.now() + 1000 * 60 * 60,
//   });

//   const drive = google.drive({ version: 'v3', auth: authClient });
//   let fileId = realFileId;

//   try {
//     // Check if localPath is a directory and exists
//     const stats = await fs.promises.stat(localPath);
//     if (!stats.isDirectory()) {
//       throw new Error(`${localPath} is not a directory`);
//     }
//   } catch (err) {
//     console.error(err);
//     throw err;
//   }

//   try {
//     const file = await drive.files.get({
//       fileId: fileId,
//       alt: 'media',
//     }, { responseType: 'stream' });
//     console.log(file.status);
//     const dest = fs.createWriteStream(localPath + `/${realFileId}.jpg`);
//     file.data.pipe(dest);

//     console.log(`Downloaded ${realFileId} to ${dest.path}`);
//   } catch (err) {
//     console.error(err);
//     throw err;
//   }
// }


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

router.get('/download/:id', ensureAuthenticated, async (req, res) => {
  const user = await User.findOne({ email: req.user.email })

  console.log('requesting file' + " " + req.params.id)
  const fileId = req.params.id;
  await downloadFile(fileId, user, res);
});


async function downloadFile(realFileId, user, res) {
  const authClient = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI
  );

  authClient.setCredentials({
    refresh_token: user.refreshToken,
    access_token: user.accessToken,
    token_type: 'Bearer',
    expiry_date: Date.now() + 1000 * 60 * 60,
  });

  const drive = google.drive({ version: 'v3', auth: authClient });
  let fileId = realFileId;

  try {
    const file = await drive.files.get({
      fileId: fileId,
      alt: 'media',
    }, { responseType: 'stream' });
    let fType = file.headers['content-type'];
    console.log(fType);
    // Set the Content-Disposition header to force download
    // res.set('Content-Disposition', `attachment; filename="${fileId}.jpg"`);

    // // Set the Content-Type header to the appropriate file type
    // res.set('Content-Type', 'image/jpeg');
    // use the mimeTypes object to set the correct content type
    let generatedFileName = `${fileId}.${mimeTypes[fType]}`;
    res.set('Content-Disposition', `attachment; filename="${fileId}.${mimeTypes[fType]}"`)
    res.set('Content-Type', fType);
    console.log(`Downloaded ${realFileId} to ${generatedFileName}`);

    // Pipe the stream directly to the response object
    file.data.pipe(res);
  } catch (err) {
    console.error(err);
    throw err;
  }
}




module.exports = router;
