import express from 'express';
import db from "../db/config.js";
import { ObjectId } from 'mongodb';

const router = express.Router();

//return first 50 documents from books collection
router.get("/", async (req,res)=>{
    let results = await db.collection('livrarias').find({})
        .limit(50)
        .toArray();
    res.send(results).status(200);
})

router.post('/addbooks', async (req, res) => {
    try {
        const booksCollection = db.collection('books');
        const livrariasCollection = db.collection('livrarias');

        // Fetch all books and livrarias asynchronously
        const books = await booksCollection.find().toArray();
        const bookDetails = books.map(book => ({
            _id: book._id,
            title: book.title,
            isbn: book.isbn,
            authors: book.authors,
            categories: book.categories,
            shortDescription: book.shortDescription,
            longDescription: book.longDescription,
            thumbnailUrl: book.thumbnailUrl
        }));

        const livrarias = await livrariasCollection.find().toArray();

        const updatedLivrarias = []; // Store updated livrarias for verification

        // Loop through each livraria and assign random books with detailed information
        for (const livraria of livrarias) {
            // Select random books for each livraria, with full book details
            const livrosAleatorios = bookDetails.sort(() => 0.5 - Math.random()).slice(0, 5); // Adjust the number of books per livraria

            // Update the livraria's books field with detailed book information
            const result = await livrariasCollection.updateOne(
                { _id: livraria._id },
                { $set: { "properties.books": livrosAleatorios } }
            );

            // If update is successful, add livraria to the array for confirmation
            if (result.modifiedCount > 0) {
                updatedLivrarias.push(livraria._id);
            }
        }

        // Fetch the updated livrarias to verify the changes
        const verifiedLivrarias = await livrariasCollection.find(
            { _id: { $in: updatedLivrarias } }
        ).toArray();

        // Send a response with the updated livrarias for verification
        res.status(201).json({
            message: "Livros aleatórios atribuídos às livrarias com detalhes",
            updatedLivrarias: verifiedLivrarias
        });

    } catch (err) {
        console.error(err);
        res.status(500).send({ error: err.message });
    }
});

router.get('/getbooks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const livrariasCollection = db.collection('livrarias');
        const livrariaId = parseInt(id.replace(':', ''), 10); // Get livraria ID from request params
        console.log(livrariaId);

        // Find the livraria by its ID
        const livraria = await livrariasCollection.findOne({ _id: livrariaId });

        if (!livraria) {
            return res.status(404).json({ message: 'Livraria not found' });
        }

        // Return the books in the livraria
        const books = livraria.properties.books || [];

        res.status(200).json({
            livrariaId: livraria._id,
            livrariaName: livraria.properties.INF_NOME,
            books: books
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});



router.get('/locatelivrarias', async (req, res) => {
    try {
        const livrariasCollection = db.collection('livrarias');

        // Create a 2D index on geometry.coordinates
        await livrariasCollection.createIndex(
            { "geometry.coordinates": "2d" }
        );

        const longitude = -9.14421890064127;
        const latitude = 38.7105419551935;

        const results = await livrariasCollection.find({
            "geometry.coordinates": { 
                $geoWithin: {
                    $center: [[longitude, latitude], 100] // Radius in "units" of your coordinates
                }
            }
        }).toArray();

        // Send the results
        res.status(200).send(results);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});


export default router