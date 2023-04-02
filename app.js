require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
mongoose.set('strictQuery', false);
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const indexRouter = require('./routes/index');
const socialRouter = require('./routes/social');
const usersRouter = require('./routes/users');

const app = express();

//EXPRESS SESSION
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: true,
        saveUninitialized: true
    })
);

//PASSPORT MIDDLEWARE
app.use(passport.initialize());
app.use(passport.session());

//CONNECT FLASH
app.use(flash());

//GLOBAL VARS
app.use(function (req, res, next) {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user;
    res.locals.accessToken = req.session.accessToken;
    next();
})


//VIEW ENGINE SETUP
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


//LOGGER
app.use(logger('dev'));

//BODY PARSER AND JSON PARSER
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//COOKIE PARSER
app.use(cookieParser());

//SET STATIC FOR STYLES AND JS
app.use(express.static(path.join(__dirname, 'public')));
// app.use((req, res, next) => {
//     console.log(req.session);
//     next();
// });
//CONFIGURE PASSPORT
require('./config/passport')(passport);
require('./config/passport-google')(passport);


//CONNECT TO MONGODB
mongoose.connect(
    process.env.MONGODB_URI,
    { useNewUrlParser: true, useUnifiedTopology: true }
).then(() => {
    console.log('MONGODB CONNECTED');
}).catch(err => console.log(err));


//ROUTE FUNCTIONS
app.use('/', indexRouter);
app.use('/auth', socialRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server started on ${PORT} OH YEAH!!!`)
})
