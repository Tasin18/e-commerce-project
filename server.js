const express = require('express');
const { result } = require('lodash');
const mysql = require('mysql');
const path = require('path');
const upload = require('./modules/multer');
const pool = require("./config/database.js");
const promise = require("./config/promise.js");
const bcrypt = require('bcrypt');
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const cors = require('cors');
const auth = require("./middleware/auth");
const auth_cust = require("./middleware/auth_cust");
const dotenv = require("dotenv");
const sendMail = require('./config/nodemail');

dotenv.config({
    path: "./env/email.env"
})

const saltRounds = 10;



const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(
    {
        origin:["http://localhost:3000"],
        methods: ["POST,GET"],
        credentials: true
    }
));
app.use(cookieParser());

// setup static file link
app.use(express.static("public"));
app.use("/css", express.static(__dirname + "public/css"));
app.use("/js",express.static(__dirname+"public/js"));
app.use('/img',express.static(__dirname + "public/img"));
app.use('/uploads',express.static(__dirname + "public/uploads"));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));




app.listen(3000, ()=>{
    console.log('server started on port 3000');
});

app.get("/test", (req, res) => {
    const html = `
        <img src="https://picsum.photos/200/300" />
        <h1>Registration Successful</h1>
    `
    sendMail("mmcse19@gmail.com", "HI", html)
})

//when server hit form page..................
app.get('/form.html',auth,(req,res)=>{
    pool.getConnection((err,Connection) =>{
        if(err){
            console.error('Error getting connection from pool:',err);
            res.status(500).json({error:'Database error'});
            return;
        }
        res.sendFile(__dirname+'/form.html');
    });
});

app.post('/form.html', upload.single("photo"), (req,res)=>{
    const {name,brand, price, category, gender} = req.body;
    
    const filename = req.file.filename;
    
        var sql = "INSERT INTO product(name,price,category,gender,photo,Brand) VALUES (?,?,?,?,?,?)";
        const result = promise.createUpdateDelete(sql,[name,price,category,gender, filename,brand]);
        res.redirect("/index.html");
});

//when server hit delete form page..................

app.get('/delete_form.html',auth,(req,res)=>{
    pool.getConnection((err,Connection) =>{
        if(err){
            console.error('Error getting connection from pool:',err);
            res.status(500).json({error:'Database error'});
            return;
        }
        res.sendFile(__dirname+'/delete_form.html');
    });
});

app.post('/delete_form.html',(req,res)=>{
    const {name, price} = req.body;
    
        var sql = "SELECT * FROM product WHERE name=?";
        pool.query(sql,[name],(error,result)=>{
            if(error){
                console.error('Error executing query:', err);
                res.status(500).json({ error: 'Database error' });
                return;
            }
            if(result.length === 0){
                res.status(200).json({ error: '404,no product found' })
                return ;
            }
            
        });
        var sql = "DELETE FROM product WHERE (name=?) AND (price=?)";
        const result = promise.createUpdateDelete(sql,[name,price]);
        res.redirect("/index");
});

//when server hit home page..................
app.get('/index.html', async (req,res)=>{
    const products = promise.readData("SELECT * FROM product LIMIT 8");
    const products2 = promise.readData("SELECT * FROM product ORDER BY id DESC LIMIT 8");

    const productObj = await products;
    const productObj2 = await products2;

    res.render("index", { data: productObj, newArrival: productObj2 });
});

//when server hit shop page..................
app.get("/shop.html",async(req,res)=>{
    const products2 = promise.readData("SELECT * FROM product ORDER BY id DESC LIMIT 16");
    const productObj2 = await products2;
    res.render("shop", {product: productObj2 });
});

//when server hit blog page..................
app.get("/blog.html",async(req,res)=>{
    res.render("blog");
});

//when server hit about page..................
app.get("/about.html",async(req,res)=>{
    res.render('about');
});

//when server hit login page..................
app.get("/login.html",async(req,res)=>{
    res.render("login");
});

app.post("/login.html",async(req,res)=>{
    const adminDetails = promise.readDataWithCondition("SELECT * FROM admin WHERE email = ?",[req.body.email]);
    const adminDetails1 = await adminDetails;
    
    const password = adminDetails1[0].password_hash;
    const userPass = req.body.password;

    if(adminDetails1.length > 0){
        bcrypt.compare(userPass,password,(err,result)=>{
            if(result){
                console.log(adminDetails1);
                const email = adminDetails1.email;
                const token = jwt.sign({email}, "our-jsonwebtoken-private-key" , {expiresIn: '1d'});
                res.cookie("token" , token);
                res.redirect("/admin_panel.html");
            }
            else{
                console.log(err)
                res.send("Incorrect password");
            }
            
        })
        
        
    }
    else{
        res.send("no records existed");
    }
})


//when server hit create new account for admin page..................
app.get("/create_account.html",async(req,res)=>{
    res.render("create_account");
});

app.post("/create_account.html",async(req,res)=>{
    const {email,phone,password,admin_code} = req.body;
    const object = promise.readData("SELECT * FROM pass");
    const obj2 = await object;

    if(admin_code==obj2[0].admin_code){
        //generating salt and encrypting the password
        const salt = bcrypt.genSaltSync(saltRounds);
        const hashedPassword = bcrypt.hashSync(password, salt);
        
        var object2 = promise.createUpdateDelete("INSERT INTO admin(email,phone,password_hash,salt) VALUES (?,?,?,?)"
        ,[email,phone,hashedPassword,salt]);
        
        const token = jwt.sign({email}, "our-jsonwebtoken-private-key" , {expiresIn: '1d'});
        res.cookie("token" , token);
        res.redirect("/index.html");
    }
    else{
        res.send("Wrong admin code.");
    }
    
});

//when server hit admin panel page..................
app.get("/admin_panel.html",auth,async(req,res)=>{
    res.render("admin_panel");
});

//when server hit contact page..................
app.get("/contact", async(req,res)=>{
    res.render("contact");
});

//when server hit single product page..................
app.get("/single_product.html",async(req,res)=>{
    const product_id = req.query.product_id;
    var obj = promise.readDataWithCondition("SELECT * FROM product WHERE id= ?",[product_id]);
    obj = await obj;
    var obj2 = promise.readData("SELECT * FROM product ORDER BY id DESC LIMIT 4")
    obj2 = await obj2;
    console.log(obj);
    res.render("single_product",{product: obj,data: obj2});
});
//when server hit logout page..................
app.get("/logout.html",auth,async(req,res)=>{
    try {
        res.clearCookie("token");
        res.redirect("/login.html");
    } catch (error) {
        res.status(501).send(error);
    }
});

//when server hit customer login page..................

app.get('/customer_login.html',async(req,res)=>{
    res.render('customer_login');
});

app.post("/customer_login.html",async(req,res)=>{
    var custDetails = promise.readDataWithCondition("SELECT * FROM user WHERE email = ?",[req.body.email]);
    custDetails = await custDetails;
    console.log(custDetails);
    const password = custDetails[0].password_hash;
    const userPass = req.body.password;
    console.log(userPass);
    if(custDetails.length > 0){
        bcrypt.compare(userPass,password,(err,result)=>{
            if(result){
                console.log(custDetails);
                const email = custDetails.email;
                const token = jwt.sign({email}, process.env.JWT_SECRET , {expiresIn: '1d'});
                res.cookie("cust" , token);
                res.redirect("/user_dashboard");
            }
            else{
                console.log(err)
                res.send("Incorrect password");
            }
            
        })          
    }
    else{
        res.send("User don't have any account.");
    }
});

app.get('/create_account_cust.html',async(req,res)=>{
    res.render('create_account_cust');
});

app.post('/create_account_cust.html',async(req,res)=>{
        const JWT_SECRET = process.env.JWT_SECRET;
        const JWT_EXPIRATION = parseInt(process.env.JWT_EXPIRATION);
        const userData = req.body;
        if(userData.password!=userData.confirm_password){
            res.send('Password did not match');
        }
        try {
            // Check if the user already exists
            const rows = await pool.query('SELECT * FROM user WHERE email = ?', [userData.email]);
            if (rows.length > 0) {
              return res.status(400).json({ error: 'User already exists' });
            }
        // if not exists
        // Hash the password before saving it to the database
            const hashedPassword = await bcrypt.hash(userData.password, 10);

            // Insert a new user record into the database
            var obj = promise.createUpdateDelete('INSERT INTO user (username,email,phone, password_hash,salt, is_verified) VALUES (?, ?, ?,?,?,?)', [userData.Username,userData.email,userData.phone, hashedPassword,10, 0]);

            // Generate a JWT token for email verification
            email = userData.email;
            const verificationToken = jwt.sign({email }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });

            sendMail(userData.email,'verify email',`Click on the following link to verify your email: http://localhost:3000/verify/${verificationToken}`);
            const token = jwt.sign({email}, JWT_SECRET , {expiresIn: JWT_EXPIRATION});
            res.cookie("cust" , token);
            res.redirect('/verify_email.html');
        } catch(error) {
        console.log(error);}
    
});

app.get('/verify/:token', async (req, res) => {
    const { token } = req.params;
  
    try {
      // Verify the JWT token
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  
      // Update the user's is_verified status in the database
      await pool.query('UPDATE user SET is_verified = ? WHERE email = ?', [1, decodedToken.email]);
  
      res.json({ message: 'Email verified successfully' });
    } catch (err) {
      console.error('Error verifying email:', err);
      res.status(400).json({ error: 'Invalid verification token' });
    }
  });


  app.get('/verify_email.html',auth_cust,async(req,res)=>{
    res.render('verify_email');
  });

  app.get('/update_form.html',auth,async(req,res)=>{
    res.render('update_form');
  });

  app.post('/update_form.html',upload.single("photo"),auth,async(req,res)=>{
    const userData = req.body;
    const filename = req.file.filename;
    const obj1 = promise.readDataWithCondition("SELECT * FROM product WHERE name=? AND price=?",[userData.name,userData.price]);
    const obj2 = await obj1;
    console.log(obj2,userData);
    if(obj2.length==0){
        res.send("NO Product Found");
    }
    else{
        const obj3 = promise.createUpdateDelete("UPDATE product SET name=? , Brand=?,price=?,category=?,gender=?,photo=? WHERE name=? AND price=?",
        [userData.new_name,userData.brand,userData.new_price,userData.category,userData.gender,filename,userData.name,userData.price]);
        res.redirect('/admin_panel.html');
    }
  });

  app.get('/cart.html',async(req,res)=>{
    res.render("cart");
  });


  app.get("/user_dashboard",auth_cust,async(req,res)=>{
    res.render("user_dashboard");
  });

  app.get("/cust_forget_pass",async(req,res)=>{
    res.render("cust_forget_pass");
  });

  app.post("/cust_forget_pass",async(req,res)=>{
        const JWT_SECRET = process.env.JWT_SECRET;
        const JWT_EXPIRATION = parseInt(process.env.JWT_EXPIRATION);
        const userData = req.body;
        try {
            // Check if the user already exists
            var rows = promise.readDataWithCondition('SELECT * FROM user WHERE email = ?', [userData.email]);
            rows = await rows;
            if (rows.length > 0) {
               // Generate a JWT token for email verification
                email = userData.email;
                const verificationToken = jwt.sign({email }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
                sendMail(userData.email,'verify email',`Click on the following link to verify your email: http://localhost:3000/verify_email/${verificationToken}`);
                res.redirect('/verify_email.html');
            }
            else{
                res.send("No Account Found");
            }
        } catch(error) {
        console.log(error);}
  });

  app.get('/verify_email/:token', async (req, res) => {
    const { token } = req.params;
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    try {
      // Verify the JWT token
      const token = jwt.sign({decodedToken}, process.env.JWT_SECRET , {expiresIn: '1d'});
      res.cookie("cust" , token);
  
    // Update the user's is_verified status in the database
        res.redirect("/cust_change_pass");
    } catch (err) {
      console.error('Error verifying email:', err);
      res.status(400).json({ error: 'Invalid verification token' });
    }
  });


  app.get("/cust_change_pass",auth_cust,async(req,res)=>{
    res.render("cust_change_pass");
  });


