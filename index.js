import express from "express";
import books from "./routes/books.js";
import comments from "./routes/comments.js";
import livrarias from "./routes/livrarias.js";
import users from "./routes/users.js";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT ; // Fixed typo here

app.use(express.json());
app.get('/', (req, res) => {
    res.send("Welcome to the API! Use /api/books to access books data.");
});
app.use("/api/books", books);
app.use("/api/comments", comments);
app.use("/api/livrarias", livrarias);
app.use("/api/users", users);


// Start the server
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`); // Use backticks for variable interpolation
});
