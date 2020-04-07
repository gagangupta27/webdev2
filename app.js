var express                 = require("express"),
    bodyParser              = require('body-parser'),
    mongoose                = require('mongoose'),
    passport                = require("passport"),
    passportlocal           = require("passport-local"),
    passportlocalmongoose   = require("passport-local-mongoose"),
    expresssession          = require("express-session"),
    request                 = require("request"),
    keys                    = require("./config/keys"),
    sgMail                  = require('@sendgrid/mail');

var  app=express();

var flag2=0;

app.use(bodyParser.urlencoded({ extended: true }));
/*    app.use(expresssession({
        secret:"gagan gupta ",
        resave:false,
        saveUninitialized:false
    }));

app.use(passport.initialize());
app.use(passport.session());
*/
app.use(function(req,res,next){
   res.locals.currentuser = req.user;
   next();
});

mongoose.connect(keys.mongodb.url,{ useNewUrlParser: true });
var shows_schema = new mongoose.Schema({
    name: String,
    text:String,
    img: String
});
var show =mongoose.model("show",shows_schema);

var userschema = new mongoose.Schema({
    name:String,
    username:String,
    password:String
});
userschema.plugin(passportlocalmongoose);
var user =mongoose.model("user",userschema);
passport.use(new passportlocal(user.authenticate()));
passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());


//======================================================================================================================
//      routes
//==================================================================================================================

app.post("/results",function(req,res){
    request("http://www.omdbapi.com/?apikey=56424262&s="+req.body.search,function(error,response,body){
        if(!error && response.statusCode==200){
            var result = JSON.parse(body);
            res.render("results.ejs",{result:result["Search"]});
            
        }
    });
});



app.get("/",function(req,res){
    res.render("index.ejs");
});

app.post("/newpost",isloggedin,function(req,res){
    show.create(req.body.sh);
        res.redirect("/");
   
});
app.get("/newpost",isloggedin,function(req,res){
   res.render("new.ejs"); 
});
app.get("/allshows",function(req,res){
          show.find({},function(err,shows){
            if(err){
                console.log(err);
            }
            else{
                res.render("allshows.ejs",{shows:shows});
            }
        });
});

app.get("/login",function(req,res){
    var errors=[];
    if(flag2 == 1 ){ 
        errors.push({ msg: 'Password Successfully Changed' });

    
    }
    res.render("login.ejs",{errors:errors}); 
   flag2=0;
});

app.post("/login",passport.authenticate("local",{successRedirect:"/",failureRedirect:"/login"}),function(req,res){
});



app.get("/forgotpassword",function(req,res){
    var errors=[];
    if(flag2 == 2 ){ 
        //<h2>Invalid 4 Digit Code !!</h2>
        errors.push({ msg: 'Invalid 4 Digit Code' });

    
    }
    res.render("forgotpassword.ejs",{errors:errors});
    flag2=0;
});

app.get("/forgotpassword/:username/:code",function(req,res){

    res.render("resetpassword.ejs",{username:req.params.username,code:req.params.code})

});


app.post("/forgotpassword/:username/:code",function(req,res){
    flag2=0;
    if(req.body.code == req.body.code2){
        user.findOne({username:req.body.username},function(err,user1){

            user1.setPassword(req.body.password, function(err, user2){ 
                user2.save();
            });
    
        });
        flag2=1;
        res.redirect("/login");
      
    }
    else{
        flag2=2;
        res.redirect("/forgotpassword");
    }
app.get("/passwordchange",function(req,res){
    var errors =[];

    if(flag2 == 0 ){ 
        //<h2>Invalid 4 Digit Code !!</h2>
        errors.push({ msg: 'Invalid 4 Digit Code' });
    } else { 
            //<h2>Password Successfully Changed</h2>
            errors.push({ msg: 'Password Successfully Changed !' });
    }
    res.render("password.ejs",{errors:errors});
});
});

app.post("/forgotpassword",function(req,res){

    flag2=0;
    var errors =[];
        user.findOne({username:req.body.username},function(err,users){
          if(err || !users){
            errors.push({ msg: 'Invalid Email ID' });
            res.render("forgotpassword.ejs",{errors:errors});  

          }
          else{
            user.findOne({username:req.body.username},function(err,users){
                
            }); 
            var code = Math.floor((Math.random() * 9000) + 1000);
            sgMail.setApiKey(keys.sendgrid.key);
        const msg = {
            to: req.body.username,
            from: 'internshipgagan@gmail.com',
            subject: 'Password change',
            text: 'pasword change',
            html: '<h1>' + code + '</h1>',
            };
        sgMail.send(msg);

        res.redirect("/forgotpassword/"+req.body.username + "/" + code)

            }
      });
   
});



app.get("/signup",function(req,res){
   res.render("signup.ejs"); 
});

app.post("/signup",function(req,res){
     let errors = [];
  if (!req.body.name || !req.body.username || !req.body.password || !req.body.password2) 
  {
    errors.push({ msg: 'Please enter all fields' });
  }

  if (req.body.password != req.body.password2) 
  {
    errors.push({ msg: 'Passwords do not match' });
  }

  if (req.body.password.length < 6) 
  {
    errors.push({ msg: 'Password must be at least 6 characters' });
  }
  if (errors.length > 0) 
  {
    res.render("signup.ejs", {
      errors:errors,
      name:req.body.name,
      username:req.body.username,
      password:req.body.password,
      password2:req.body.password2
                            });
  } else 
    {
    user.findOne({ username: req.body.username },function(err,users){
        if(err)
        {
            console.log(err);
        }
         if (users) {
        errors.push({ msg: 'Email already exists' });
        res.render("signup.ejs", {
      errors:errors,
      name:req.body.name,
      username:req.body.username,
      password:req.body.password,
      password2:req.body.password2
        });
    }
    else {
    user.register(new user({username:req.body.username,name:req.body.name}),req.body.password,function(err,user){
      if(err){
          console.log(err);
          res.redirect("/signup");
      } 
      passport.authenticate("local")(req,res,function(){
         res.redirect("/"); 
      });
   });
    }
    });
    
}
});

app.get("/logout",isloggedin,function(req,res){
   req.logout();
   res.redirect("/");
});

app.get("/profile/:id",isloggedin,function(req,res){
    res.render("profile.ejs");
});

app.get("/shows/:id",function(req,res){
    
    request("http://www.omdbapi.com/?apikey=56424262&i="+req.params.id,function(error,response,body){
        if(!error && response.statusCode==200){
            var result = JSON.parse(body);
            res.render("shows.ejs",{result:result});
            console.log(result);
        }
    });
});


function isloggedin(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/login");
}

function loginmiddleware(req,res,next)
{
        if(0)
        {
        }
        else{
        passport.authenticate("local",{
        successRedirect:"/",
        failureRedirect:"/login"
        });
        }
}
app.listen(process.env.PORT,process.env.IP,function(){
    console.log("server is running");
});
