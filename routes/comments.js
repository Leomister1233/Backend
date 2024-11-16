import express from 'express';
import db from "../db/config.js";
import { ObjectId } from 'mongodb';

const router = express.Router();

//return first 50 documents from books collection
router.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 10; 
        const skip = (page - 1) * limit; 

        
        const comments = await db.collection("comments")
            .find({})
            .skip(skip)
            .limit(limit)
            .toArray();

        
        const totalComments = await db.collection("comments").countDocuments();
        const totalPages = Math.ceil(totalComments / limit);

       
        const response = {
            comments,
            pagination: {
                count: totalComments,
                pages: totalPages,
                currentPage: page,
                next: page < totalPages ? `/?page=${page + 1}&limit=${limit}` : null,
                prev: page > 1 ? `/?page=${page - 1}&limit=${limit}` : null,
            },
        };

        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving comments", error: error.message });
    }
});

router.post("/", async (req, res) => {
    const comment = {
      user_id: 101,
      book_id: 32,
      comment: "This book provided great insights into Android development. Highly recommend it!",
      date: 1671242050000
    };
  
    try {
      const commentsCollection = db.collection("comments");
      const result = await commentsCollection.insertOne(comment);
  
      res.status(201).json({
        message: "Comment added successfully",
        result: result
      });
    } catch (error) {
      res.status(500).json({
        message: "Error adding comment",
        error: error.message
      });
    }
  });
  
//DELETE /comments/:id
router.delete("/:id", async (req, res) => {
    const {id} = req.params;
    const commentId = parseInt(id.replace(":", ""), 10);
    console.log(commentId)

    if (isNaN(commentId)) {
        return res.status(400).send({ message: "Invalido _id. deveria ser um inteiro." });
    }

    try {
        const result = await db.collection("comments").deleteOne({ _id: commentId });

        if (result.deletedCount === 0) {
            return res.status(404).send({ message: "Comentário não encontrado para o _id fornecido." });
        }

        res.status(200).send({ message: "Comment deleted successfully." });
    } catch (error) {
        console.error("Erro ao apagar comentário:", error);
        res.status(500).send({ error: "Erro ao apagar comentário", details: error });
    }
});

export default router