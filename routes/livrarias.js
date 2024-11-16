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
        const page = parseInt(req.query.page) || 1; // Default to page 1
        const limit = parseInt(req.query.limit) || 10; // Default to 10 books per page
        const skip = (page - 1) * limit; // Calculate how many books to skip

        const livrariasCollection = db.collection('livrarias');
        const livrariaId = parseInt(id.replace(':', ''), 10); // Parse livraria ID
        console.log(livrariaId);

        // Find the livraria by its ID
        const livraria = await livrariasCollection.findOne({ _id: livrariaId });

        if (!livraria) {
            return res.status(404).json({ message: 'Livraria not found' });
        }

        // Extract books from livraria
        const books = livraria.properties.books || [];

        // Apply pagination
        const paginatedBooks = books.slice(skip, skip + limit);
        const totalBooks = books.length;
        const totalPages = Math.ceil(totalBooks / limit);

        // Response with paginated books
        res.status(200).json({
            pagination: {
                count: totalBooks,
                pages: totalPages,
                currentPage: page,
                next: page < totalPages ? `/getbooks/${id}?page=${page + 1}&limit=${limit}` : null,
                prev: page > 1 ? `/getbooks/${id}?page=${page - 1}&limit=${limit}` : null,
            },
            livrariaId: livraria._id,
            livrariaName: livraria.properties.INF_NOME,
            books: paginatedBooks,
            
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

        const longitude = parseFloat(req.query.longitude) || -9.14421890064127; // Default longitude
        const latitude = parseFloat(req.query.latitude) || 38.7105419551935;   // Default latitude
        const radius = parseFloat(req.query.radius) || 100; // Radius in "units" of your coordinates

        const page = parseInt(req.query.page) || 1; // Default to page 1
        const limit = parseInt(req.query.limit) || 10; // Default to 10 results per page
        const skip = (page - 1) * limit; // Calculate the number of results to skip

        // Find livrarias within the specified radius
        const results = await livrariasCollection.find({
            "geometry.coordinates": {
                $geoWithin: {
                    $center: [[longitude, latitude], radius]
                }
            }
        })
        .skip(skip)
        .limit(limit)
        .toArray();

        // Count the total number of matching livrarias
        const totalLivrarias = await livrariasCollection.countDocuments({
            "geometry.coordinates": {
                $geoWithin: {
                    $center: [[longitude, latitude], radius]
                }
            }
        });

        const totalPages = Math.ceil(totalLivrarias / limit);

        // Send the paginated results
        res.status(200).json({
            pagination: {
                count: totalLivrarias,
                pages: totalPages,
                currentPage: page,
                next: page < totalPages ? `/locatelivrarias?page=${page + 1}&limit=${limit}&longitude=${longitude}&latitude=${latitude}&radius=${radius}` : null,
                prev: page > 1 ? `/locatelivrarias?page=${page - 1}&limit=${limit}&longitude=${longitude}&latitude=${latitude}&radius=${radius}` : null,
            },
            livrarias: results,
            
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.get('/countlivrarias', async (req, res) => {
    try {
        const livrariasCollection = db.collection('livrarias');

        // Create a 2D index on geometry.coordinates
        await livrariasCollection.createIndex(
            { "geometry.coordinates": "2d" }
        );

        const longitude = parseFloat(req.query.longitude) || -9.14421890064127; // Default longitude
        const latitude = parseFloat(req.query.latitude) || 38.7105419551935;   // Default latitude
        const radius = parseFloat(req.query.radius) || 100; // Radius in "units" of your coordinates

        const page = parseInt(req.query.page) || 1; // Default to page 1
        const limit = parseInt(req.query.limit) || 10; // Default to 10 results per page
        const skip = (page - 1) * limit; // Calculate the number of results to skip

        // Query for all results within the specified radius
        const totalResults = await livrariasCollection.countDocuments({
            "geometry.coordinates": {
                $geoWithin: {
                    $center: [[longitude, latitude], radius]
                }
            }
        });

        // Query for paginated results
        const results = await livrariasCollection.find({
            "geometry.coordinates": {
                $geoWithin: {
                    $center: [[longitude, latitude], radius]
                }
            }
        })
        .skip(skip)
        .limit(limit)
        .toArray();

        const totalPages = Math.ceil(totalResults / limit);

        // Send the count, results, and pagination info
        res.status(200).json({
            pagination: {
                count: totalResults,
                pages: totalPages,
                currentPage: page,
                next: page < totalPages ? `/countlivrarias?page=${page + 1}&limit=${limit}&longitude=${longitude}&latitude=${latitude}&radius=${radius}` : null,
                prev: page > 1 ? `/countlivrarias?page=${page - 1}&limit=${limit}&longitude=${longitude}&latitude=${latitude}&radius=${radius}` : null,
            },
            count: totalResults,
            livrarias: results,
            
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



export default router