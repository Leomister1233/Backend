import express from 'express';
import db from "../db/config.js";
import { ObjectId } from 'mongodb';
import { point } from '@turf/helpers';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';

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
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 10; 
        const skip = (page - 1) * limit; 

        const livrariasCollection = db.collection('livrarias');
        const livrariaId = parseInt(id.replace(':', ''), 10); 
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

        const longitude = parseFloat(req.query.longitude) || -9.14421890064127; // longitude
        const latitude = parseFloat(req.query.latitude) || 38.7105419551935;   //  latitude
        const radius = parseFloat(req.query.radius) || 100; 

        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 10; 
        const skip = (page - 1) * limit; 

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

//Retornar número de livrarias perto de uma localização 
//GET localhost:3000/api/livrarias/countlivrarias

router.get('/countlivrarias', async (req, res) => {
    try {
        const livrariasCollection = db.collection('livrarias');

        // Create a 2D index on geometry.coordinates
        await livrariasCollection.createIndex(
            { "geometry.coordinates": "2d" }
        );

        const longitude = parseFloat(req.query.longitude) || -9.14421890064127; 
        const latitude = parseFloat(req.query.latitude) || 38.7105419551935;   
        const radius = parseFloat(req.query.radius) || 100; 

        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 10; 
        const skip = (page - 1) * limit; 

       
        const totalResults = await livrariasCollection.countDocuments({
            "geometry.coordinates": {
                $geoWithin: {
                    $center: [[longitude, latitude], radius]
                }
            }
        });

       
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

// PUT /livrarias/:id
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
  
    if (!updatedData || Object.keys(updatedData).length === 0) {
      return res.status(400).send({ message: "Nenhum dado para atualizar" });
    }
  
    try {
      const result = await db.collection("livrarias").updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
  
      if (result.matchedCount === 0) {
        return res.status(404).send({ message: "Livraria não encontrada" });
      }
  
      res.status(200).send({ message: "Livraria atualizada com sucesso", result });
    } catch (error) {
      console.error("Erro ao atualizar livraria:", error);
      res.status(500).send({ error: "Erro ao atualizar livraria", details: error });
    }
  });
  
  // POST /livrarias/perto - Busca livrarias próximas a uma rota
  router.post("/perto", async (req, res) => {
    const { rota, distanciaLimite } = req.body;
  
    if (!rota || !Array.isArray(rota)) {
      return res.status(400).send({ error: "Rota inválida ou ausente" });
    }
  
    try {
      const livrarias = await db.collection("livrarias").find({}).toArray();
      const limite = distanciaLimite || 0.5; 
      const turf = await import("@turf/turf");
      const linhaDaRota = turf.lineString(rota);
  
      const livrariasProximas = livrarias.filter((livraria) => {
        if (!livraria.geometry || !livraria.geometry.coordinates) return false;
        const ponto = turf.point(livraria.geometry.coordinates);
        const distancia = turf.pointToLineDistance(ponto, linhaDaRota, { units: "kilometers" });
        return distancia <= limite;
      });
  
      res.status(200).send(livrariasProximas);
    } catch (error) {
      console.error("Erro ao buscar livrarias próximas:", error);
      res.status(500).send({ error: "Erro ao buscar livrarias próximas", details: error });
    }
  });
  
  
  
  // DELETE /livrarias/:id - Remove uma livraria pelo ID
  router.delete("/:id", async (req, res) => {
    const { id } = req.params;
  
    try {
      const result = await db.collection("livrarias").deleteOne({ _id: new ObjectId(id) });
  
      if (result.deletedCount === 0) {
        return res.status(404).send({ message: "Livraria não encontrada" });
      }
  
      res.status(200).send({ message: "Livraria removida com sucesso" });
    } catch (error) {
      console.error("Erro ao deletar livraria:", error);
      res.status(500).send({ error: "Erro ao apagar livraria", details: error });
    }
  });
  
  //Rota
  router.get('/livrarias_em_rota', async (req, res) => {
    try {
      const livrariasCollection = db.collection('livrarias');
  
      await livrariasCollection.createIndex({ "geometry.coordinates": "2d" });
  
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20; 
      const skip = (page - 1) * limit;
  
      // Define the polygon for geo query
      const geoQuery = {
        "geometry.coordinates": {
          $geoIntersects: {
            $geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [-9.14217296415889, 38.7155597377788],
                  [-9.14632734020411, 38.7202915388439],
                  [-9.14875439274829, 38.7208771016563],
                  [-9.1621026515977, 38.7236706345087],
                  [-9.14217296415889, 38.7155597377788]
                ]
              ]
            }
          }
        }
      };
  

      const livrarias = await livrariasCollection.find(geoQuery)
        .skip(skip)  
        .limit(limit)  
        .toArray();
  
    
      const totalLivrarias = await livrariasCollection.countDocuments(geoQuery);
  
     
      const totalPages = Math.ceil(totalLivrarias / limit);
  
     
      const response = {
        pagination: {
          count: totalLivrarias,
          pages: totalPages,
          currentPage: page,
          next: page < totalPages ? `/api/livrarias/livrarias_em_rota?page=${page + 1}&limit=${limit}` : null,
          prev: page > 1 ? `/api/livrarias/livrarias_em_rota?page=${page - 1}&limit=${limit}` : null
        },
        livrarias: livrarias
      };
  

      res.status(200).json(response);
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });
  
  
  // POST /livrarias/check-point 
  router.get("/check-point", async (req, res) => {
    const inputPoint = [-9.155644342145884, 38.72749043040882];
  
    if (!inputPoint || inputPoint.length !== 2 || isNaN(inputPoint[0]) || isNaN(inputPoint[1])) {
      return res.status(400).send({ message: "Ponto inválido. Deve ser [longitude, latitude]." });
    }
  
    try {
      const polygon = {
        type: "Polygon",
        coordinates: [
          [
            [-9.14217296415889, 38.7155597377788],
            [-9.14632734020411, 38.7202915388439],
            [-9.14875439274829, 38.7208771016563],
            [-9.1621026515977, 38.7236706345087],
            [-9.14217296415889, 38.7155597377788] 
          ]
        ]
      };
  
      const geoJsonPoint = point(inputPoint);
      const isInside = booleanPointInPolygon(geoJsonPoint, polygon);
  
      if (isInside) {
        return res.status(200).send({ message: "User está dentro da feira do livro" });
      } else {
        return res.status(200).send({ message: "User está fora da feira do livro" });
      }
  
    } catch (error) {
      console.error("Erro ao processar o pedido:", error);
      return res.status(500).send({ error: "Erro ao processar o pedido", details: error.message || error });
    }
  });
  

export default router