const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

/*----------------------JWT methods------------------------ */
function createToken(user) {
  const token = jwt.sign(
    {
      email: user?.email,
    },
    "secret",
    { expiresIn: "7d" }
  );
  return token;
}

function verifyToken(req, res, next) {
  const authToken = req.headers.authorization.split(" ")[1];
  var decoded = jwt.verify(authToken, "secret");
  if (!decoded?.email) {
    res.send("You are not verified");
  } else {
    req.user = decoded?.email;
    next();
  }
}

const uri = process.env.MONGO_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");

    const userDB = client.db("userDB");
    const users = userDB.collection("users");
    const productDB = client.db("productDB");
    const products = productDB.collection("products");

    /* ----------------USERS API------------------- */
    app.post("/users", async (req, res) => {
      const user = req.body;
      const token = createToken(user);
      const userExist = await users.findOne({ email: user?.email });
      if (userExist) {
        res.send({ status: "success", message: "logged in", token: token });
      } else {
        await users.insertOne(user);
        res.send({ token: token });
      }
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const result = await users.findOne({ email: email });
      res.send(result);
    });

    app.patch("/users/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const result = await users.updateOne(
        { email: email },
        { $set: user },
        { upsert: true }
      );
      res.send(result);
    });

    /* --------------Products API -----------------*/
    app.get("/products", async (req, res) => {
      const result = await products.find();
      res.send(await result.toArray());
    });
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const result = await products.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });
    /* app.post("/products/", verifyToken, async (req, res) => {
      const product = req.body;
      const result = await products.insertMany(product);
      res.send(result);
    }); */
    app.post("/products/", verifyToken, async (req, res) => {
      const product = req.body;
      const result = await products.insertOne(product);
      res.send(result);
    });
    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const product = req.body;
      const result = await products.updateOne(
        { _id: new ObjectId(id) },
        { $set: product },
        { upsert: true }
      );
      res.send(result);
    });
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const result = await products.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);
