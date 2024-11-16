import express from 'express';
import db from "../db/config.js";
import { ObjectId } from 'mongodb';

const router = express.Router();

//return first 50 documents from books collection
router.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
        const limit = parseInt(req.query.limit) || 10; // Default to 10 comments per page
        const skip = (page - 1) * limit; // Calculate how many documents to skip

        // Fetch paginated comments
        const comments = await db.collection("comments")
            .find({})
            .skip(skip)
            .limit(limit)
            .toArray();

        // Count total comments for pagination
        const totalComments = await db.collection("comments").countDocuments();
        const totalPages = Math.ceil(totalComments / limit);

        // Construct response
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


export default router