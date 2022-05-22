const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

const app = express();


// middleware
app.use(express.json());
app.use(cors());


// ------------------------------------------------





// testing response - [delete it before start]
app.get('/',(req,res)=> {
    res.send('response successfully sent');
})






// ------------------------------------------------


// listening the server at the given port
app.listen(port,()=> {
    console.log(`server is running at the port : ${port}`);
})