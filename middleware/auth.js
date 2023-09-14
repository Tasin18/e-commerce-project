const jwt = require("jsonwebtoken");

const auth = async(req,res,next)=>{
    try {
        const token = req.cookies.token;
        const verifyUser = jwt.verify(token,"our-jsonwebtoken-private-key");
        console.log(verifyUser);
        next();
    } catch (error) {
        res.status(401).send(error);
    }
}



module.exports = auth;