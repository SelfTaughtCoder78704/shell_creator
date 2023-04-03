const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user-model");
module.exports = function (passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback",
        passReqToCallback: true
      },
      async (req, accessToken, refreshToken, profile, done) => {
        const expiryTimestamp = Math.floor((Date.now() + 3600000) / 1000);
        try {
          const user = await User.findOne({ email: req.user.email });

          user.googleId = profile.id;
          user.accessToken = accessToken;
          user.refreshToken = refreshToken;
          user.expiryDate = expiryTimestamp;
          user.save();
          done(null, user);

        } catch (err) {
          done(err);
        }
      }
    )
  );
};
