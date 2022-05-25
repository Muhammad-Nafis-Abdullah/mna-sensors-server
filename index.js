const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

const app = express();


// middleware
app.use(express.json());
app.use(cors());

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

const uri = `mongodb+srv://${process.env.DB_Admin}:${process.env.DB_Pass}@mna-sensors.4ipbl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {
        await client.connect();
        const sensorsCollection = client.db('mnaSensors').collection('sensors');
        const orderCollection = client.db('mnaSensors').collection('orders');
        const blogCollection = client.db('mnaSensors').collection('blogs');
        const userCollection = client.db('mnaSensors').collection('users');
        
        app.get('/blogs',async (req,res)=> {
            const blogs = await blogCollection.find({}).toArray();
            res.send(blogs);
        })

        app.get('/sensors',async (req,res)=> {
            const query = {};
            const sensors = await sensorsCollection.find(query).toArray();
            res.send(sensors);
        })

        app.get('/sensor/:id',async (req,res)=> {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const sensor = await sensorsCollection.find(query).toArray();
            res.send(sensor);
        })

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

        app.get('/orders/count',async (req,res)=> {
            const orders = await orderCollection.find({}).toArray();
            res.send({orders:orders.length});
        })

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

        app.get('/users/count',async (req,res)=> {
            const userCount = await userCollection.find({}).toArray();
            res.send({usersNumber : userCount.length})
        } )

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