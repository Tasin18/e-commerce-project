const jwt = require("jsonwebtoken");

const auth_cust = async(req,res,next)=>{
    try {
        const token = req.cookies.cust;
        const verifyUser = jwt.verify(token,"my_secret_key");
        console.log(verifyUser);
        next();
    } catch (error) {
        res.status(401).send(error);
    }
}

module.exports = auth_cust;