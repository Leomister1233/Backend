import express from 'express';
import db from "../db/config.js";
import { ObjectId } from 'mongodb';

const router = express.Router();

//return first 50 documents from books collection
router.get("/", async (req, res) => {
    try {
        const results = await db.collection('books').find({}).limit(50).toArray();
        res.status(200).send(results); // Set status before sending response
    } catch (error) {
        res.status(500).json({ message: "Error retrieving books", error: error.message });
    }
});

// Get books with pagination
router.get("/getbook", async (req, res) => {
    try {
        const booksCollection = db.collection("books");

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const books = await booksCollection.find({}).skip(skip).limit(limit).toArray();
        const totalBooks = await booksCollection.countDocuments(); // Get total number of books

        // Calculate total pages and determine next/prev page links
        const totalPages = Math.ceil(totalBooks / limit);
        const nextPage = page < totalPages ? `${req.protocol}://${req.get('host')}${req.baseUrl}/getbook?page=${page + 1}&limit=${limit}` : null;
        const prevPage = page > 1 ? `${req.protocol}://${req.get('host')}${req.baseUrl}/getbook?page=${page - 1}&limit=${limit}` : null;

        res.status(200).json({
            count: totalBooks, // Total number of books
            pages: totalPages, // Total pages
            next: nextPage, // Link to the next page
            prev: prevPage, // Link to the previous page
            currentPage: page, // Current page number
            books, // List of books for the current page
        });
    } catch (error) {
        res.status(500).json({ message: "Error retrieving books", error: error.message });
    }
});


router.get('/searchbook/:id', async (req, res) => {
    try {
        const { id } = req.params; 
        const book_id = parseInt(id.replace(':', ''), 10); // Extract book ID
        const booksCollection = db.collection('books');
        const commentsCollection = db.collection('comments');
        const usersCollection = db.collection('users');

        // Fetch the book from the collection by _id
        const book = await booksCollection.findOne({ _id: book_id });
        if (!book) {
            return res.status(404).json({ message: "Livro não encontrado." });
        }

        // Pagination for reviews
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5; // Limit reviews per page
        const skip = (page - 1) * limit;

        // Fetch reviews and calculate the average score
        const userReviews = await usersCollection.aggregate([
            { $unwind: "$reviews" },
            { $match: { "reviews.book_id": book_id } },
            { $skip: skip }, // Skip based on pagination
            { $limit: limit }, // Limit based on pagination
            {
                $group: {
                    _id: null,
                    reviews: { $push: "$reviews" },
                    averageScore: { $avg: "$reviews.score" }
                }
            }
        ]).toArray();

        // Extract average score and reviews
        const averageScore = userReviews.length > 0 ? userReviews[0].averageScore : null;
        const reviews = userReviews.length > 0 ? userReviews[0].reviews : [];

        // Pagination for comments
        const commentPage = parseInt(req.query.commentPage) || 1;
        const commentLimit = parseInt(req.query.commentLimit) || 20;
        const commentSkip = (commentPage - 1) * commentLimit;

        // Fetch comments related to the book with pagination
        const comments = await commentsCollection.aggregate([
            { $match: { book_id: book_id } },
            { $skip: commentSkip },
            { $limit: commentLimit },
            { $project: { comment: 1, _id: 0 } }
        ]).toArray();

        // Fetch total counts for comments and reviews for pagination info
        const totalComments = await commentsCollection.countDocuments({ book_id: book_id });
        const totalReviews = userReviews.length > 0 ? userReviews[0].reviews.length : 0;

        // Prepare and send the response
        const response = {
            pagination: {
                reviews: {
                    count: totalReviews,
                    pages: Math.ceil(totalReviews / limit),
                    currentPage: page,
                    next: page < Math.ceil(totalReviews / limit) ? `/api/books/searchbook/${id}?page=${page + 1}&limit=${limit}` : null,
                    prev: page > 1 ? `/api/books/searchbook/${id}?page=${page - 1}&limit=${limit}` : null,
                },
                comments: {
                    count: totalComments,
                    pages: Math.ceil(totalComments / commentLimit),
                    currentPage: commentPage,
                    next: commentPage < Math.ceil(totalComments / commentLimit) ? `/api/books/searchbook/${id}?commentPage=${commentPage + 1}&commentLimit=${commentLimit}` : null,
                    prev: commentPage > 1 ? `/api/books/searchbook/${id}?commentPage=${commentPage - 1}&commentLimit=${commentLimit}` : null,
                }
            },
            book: book,
            averageScore: averageScore,
            reviews: reviews,
            comments: comments,
            
        };

        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving book", error: error.message });
    }
});



router.post('/createbooks',async (req,res)=>{
    try{
        const booksCollection = db.collection('books');
        const lastBooks = await usersCollection.find().sort({ _id: -1 }).limit(1).toArray();

         // Determine the new user's ID by incrementing the last user's 
        const newBookId = lastUser.length > 0 ? lastBooks[0]._id + 1 : 1;
        const newBook ={
            _id: newBookId,
            title: "Learning React",
            isbn: "9781491954621",
            pageCount: 350,
            publishedDate: new Date("2017-06-01T07:00:00.000+00:00"),
            thumbnailUrl: "https://example.com/book-thumb-images/learning-react.jpg",
            shortDescription: "Learning React introduces the essentials of React, a popular JavaScript library.",
            longDescription: "React is a powerful library for creating dynamic user interfaces. This book covers the basics, advanced patterns, and practical applications of React.",
            status: "PUBLISH",
            authors: ["Alex Banks", "Eve Porcello"],
            categories: ["JavaScript", "Web Development"] 
        }
        const createbooks = await booksCollection.inserOne(newBook) 
    }catch(error){
        res.status(500).json({message:"Error creating books", error: error.message});
    }
})

router.delete('/deletebook/:id', async (req, res) => {
    try {
        const { id } = req.params; 
        const book_id = parseInt(id.replace(':', ''), 10);
        const booksCollection = db.collection('books');
        const deletebook= booksCollection.db.delete({_id: book_id})
        if (deletebook.result.n === 0) {
            return res.status(404).json({ message: "Livro não encontrado." });
        }
        if(deletebook.result.n === 1) {
            return res.status(204).json({ message: "Livro excluído com sucesso." });  // No Content status code
        }
      
    } catch (error) {
        res.status(500).json({ message: "Error retrieving book", error: error.message });
    }
});

router.get('/comments', async (req, res) => {
    try {
        const booksCollection = db.collection('books');
        const commentsCollection = db.collection('comments');

        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5; // Limit books per page
        const skip = (page - 1) * limit;

        // Retrieve books with comments and their respective count
        const booksWithComments = await booksCollection.aggregate([
            {
                $lookup: {
                    from: "comments",  // Collection of comments
                    localField: "_id",  // Field in the books collection
                    foreignField: "book_id",  // Field in the comments collection
                    as: "comments"  // Store related comments in this field
                }
            },
            {
                $addFields: {
                    commentCount: { $size: "$comments" }  // Add the comment count
                }
            },
            {
                $match: {
                    commentCount: { $gt: 0 }  // Only include books with at least one comment
                }
            },
            {
                $sort: { commentCount: -1 }  // Sort by comment count in descending order
            },
            {
                $skip: skip,  // Skip based on page
            },
            {
                $limit: limit,  // Limit based on page
            },
            {
                $project: {
                    title: 1,  // Include book title in response
                    commentCount: 1  // Include comment count in response
                }
            }
        ]).toArray();

        // Fetch total count of books with comments for pagination info
        const totalBooksWithComments = await booksCollection.aggregate([
            {
                $lookup: {
                    from: "comments",  // Collection of comments
                    localField: "_id",  // Field in the books collection
                    foreignField: "book_id",  // Field in the comments collection
                    as: "comments"  // Store related comments in this field
                }
            },
            {
                $addFields: {
                    commentCount: { $size: "$comments" }  // Add the comment count
                }
            },
            {
                $match: {
                    commentCount: { $gt: 0 }  // Only include books with at least one comment
                }
            },
            {
                $count: "total"  // Count the total number of books with comments
            }
        ]).toArray();

        const totalCount = totalBooksWithComments.length > 0 ? totalBooksWithComments[0].total : 0;

        // Calculate total pages for pagination
        const totalPages = Math.ceil(totalCount / limit);

        // Response object with pagination info
        const response = {
            books: booksWithComments,
            pagination: {
                count: totalCount,
                pages: totalPages,
                currentPage: page,
                next: page < totalPages ? `/api/books/comments?page=${page + 1}&limit=${limit}` : null,
                prev: page > 1 ? `/api/books/comments?page=${page - 1}&limit=${limit}` : null
            }
        };

        // Send response with books and pagination info
        res.status(200).json(response);

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Erro ao recuperar livros com comentários", error: error.message });
    }
});


router.get('/search/categories',async (req,res)=>{
    try{
        const booksCollection = await db.collection('books');
        const categories= "Open Source"
        const searchbook = await booksCollection.aggregate([
            {
                $unwind: "$categories" // Unwind the categories array
            },
            {
                $group: {
                    _id: "$categories", // Group by category
                    books: {
                        $push: {
                            _id: "$_id",
                            title: "$title",
                            authors: "$authors",
                            publishedDate: "$publishedDate",
                            thumbnailUrl: "$thumbnailUrl"
                        }
                    }
                }
            },
            {
                $sort: { _id: 1 } // Sort categories alphabetically
            }
        ]).toArray();

        const response = {
            books:searchbook
        }

        res.status(200).json(response);

    }catch(error){
        res.status(500).json({message:"Error searching categories", error: error.message});
    }
})


export default router