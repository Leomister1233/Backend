import { MongoClient } from "mongodb";
import dotenv from 'dotenv';

dotenv.config();
const connectionString = process.env.MONGO_URI;

const client = new MongoClient(connectionString);
let db;

async function connectToDatabase() {
    try {
        const conn = await client.connect();
        db = conn.db("Dataleo"); 
        
        console.log("Connected to MongoDB database:", db.databaseName);
       /* await db.collection('livrarias').createIndex({ "geometry.coordinates": "2dindex" });
        console.log('Geospatial index created on geometry.coordinates');
        await db.collection('livrarias').createIndex({ "geometry.coordinates": "2dsphere" });*/
        
    } catch (err) {
        console.error("Error connecting to MongoDB:", err);
    }
}

await connectToDatabase();

export default db;
