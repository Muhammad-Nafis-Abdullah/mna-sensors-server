const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();


// middleware
app.use(express.json());
app.use(cors());

// token verification
const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return req.status(401).send({ message: "Can't Authorize the Access" });
    }
    const accessToken = authHeader.split(" ")[1];
    jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: "Forbidden Access" });
        }
        req.decoded = decoded;
        next();
    });
};

//  admin verification
const verifyAdmin = async (req, res, next) => {
    const userEmail = req.decoded.email;
    const user = await userCollection.findOne({
        email: userEmail,
    });
    if (user.role === "admin") {
        next();
    } else {
        res.status(403).send({ message: "Forbidden access" });
    }
};

const uri = `mongodb+srv://${process.env.DB_Admin}:${process.env.DB_Pass}@mna-sensors.4ipbl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {
        await client.connect();
        const sensorsCollection = client.db('mnaSensors').collection('sensors');
        const orderCollection = client.db('mnaSensors').collection('orders');
        const blogCollection = client.db('mnaSensors').collection('blogs');
        const userCollection = client.db('mnaSensors').collection('users');
        const reviewCollection = client.db('mnaSensors').collection('reviews');

        // get all blogs
        app.get('/blogs',async (req,res)=> {
            const blogs = await blogCollection.find({}).toArray();
            res.send(blogs);
        })

        // get all sensors
        app.get('/sensors',async (req,res)=> {
            const query = {};
            const sensors = await sensorsCollection.find(query).toArray();
            res.send(sensors);
        })

        // get a sensor information through id
        app.get('/sensor/:id',async (req,res)=> {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const sensor = await sensorsCollection.find(query).toArray();
            res.send(sensor);
        })

        // purchase an order or update order quantity 
        app.post('/order',async (req,res)=> {
            const order = req.body;
            // const inserted = await orderCollection.insertOne(order) ;
            // res.send(order);
            
            const query = {
                email: order.email,
                productId: order.productId,
            }
            const exists = await orderCollection.findOne(query);
            if (exists) {
                const options = { upsert: true };
                const updatedDoc = {
                    $set: {
                        orderQuantity: exists.orderQuantity+order.orderQuantity,
                        orderCost: exists.orderCost+order.orderCost
                    },
                };
                const result = await orderCollection.updateOne(
                    query,
                    updatedDoc,
                    options
                );
                return res.send({ update: true, result });
            }
            const result = await orderCollection.insertOne(order);
            return res.send({ success: true, result });
        })        

        //get an specific Order with Id
        app.get("/order/:id", verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const order = await orderCollection.findOne(query);
            res.send(order);
        });

        // count total order
        app.get('/orders/count',async (req,res)=> {
            const orders = await orderCollection.find({}).toArray();
            res.send({orders:orders.length});
        })

        // get all the order of an user
        app.get("/orders", verifyJWT, async (req, res) => {
            const userEmail = req.query.email;

            const query = { email: userEmail };
            const cursor = orderCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        });

        // update a sensor quantity through id
        app.put("/sensor/:id", async (req, res) => {
            const orderId = req.params.id;
            const updateQuantity = req.body;
            const filter = { _id: ObjectId(orderId) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    availableQuantity: updateQuantity.remaniningQuantity,
                },
            };
            const result = await sensorsCollection.updateOne(
                filter,
                updatedDoc,
                options
            );
            res.send(result);
        });

        // add or update user information
        app.put("/user/:email", async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updatedDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(
                filter,
                updatedDoc,
                options
            );
            const accessToken = jwt.sign(filter, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: "1d",
            });
            res.send({ result, accessToken });
        });

        // total user count
        app.get('/users/count',async (req,res)=> {
            const userCount = await userCollection.find({}).toArray();
            res.send({usersNumber : userCount.length})
        } )

        // add or update an user review
        app.put('/review/:email',async (req,res)=> {
            const email = req.params.email;
            const review = req.body;
            
            const query = {
                email: email,
            }
            const exists = await reviewCollection.findOne(query);
            if (exists) {
                const options = { upsert: true };
                const updatedDoc = {
                    $set: {
                        comment: review.comment,
                        rating: review.rating
                    },
                };
                const result = await reviewCollection.updateOne(
                    query,
                    updatedDoc,
                    options
                );
                return res.send({ update: true, result });
            }
            const result = await reviewCollection.insertOne(review);
            return res.send({ success: true, result });
        })

        // get user review through email
        app.get('/review/:email',async (req,res)=> {
            const email = req.params.email;
            const review = await reviewCollection.findOne({email});
            res.send(review);
        })

    } finally {

    }
}
run().catch(console.dir);




// testing response - [delete it before start]
app.get('/',(req,res)=> {
    res.send('response successfully sent');
})






// ------------------------------------------------


// listening the server at the given port
app.listen(port,()=> {
    console.log(`server is running at the port : ${port}`);
})