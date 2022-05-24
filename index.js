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


const uri = `mongodb+srv://${process.env.DB_Admin}:${process.env.DB_Pass}@mna-sensors.4ipbl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {
        await client.connect();
        const sensorsCollection = client.db('mnaSensors').collection('sensors');
        const orderCollection = client.db('mnaSensors').collection('orders');
        
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