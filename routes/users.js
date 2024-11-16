import express from 'express';
import db from "../db/config.js";
import { ObjectId } from 'mongodb';

const router = express.Router();

//return first 50 documents from books collection
router.get("/", async (req,res)=>{
    let results = await db.collection('users').find({})
        .limit(50)
        .toArray();
    res.send(results).status(200);
})

//Listadeuserscompaginação.
router.get("/getusers", async (req, res) => {
    try {
        const usersCollection = db.collection("users");
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const users = await usersCollection.find({}).skip(skip).limit(limit).toArray();
        const totalUsers = await usersCollection.countDocuments(); // Optional: total count for pagination info

        const totalPages = Math.ceil(totalUsers / limit);

        const response = {
            totalUsers,
            totalPages,
            currentPage: page,
            users,
            pagination: {
                next: page < totalPages ? `/api/users/getusers?page=${page + 1}&limit=${limit}` : null,
                prev: page > 1 ? `/api/users/getusers?page=${page - 1}&limit=${limit}` : null,
            }
        };

        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving users", error: error.message });
    }
});


router.get('/user/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = parseInt(id.replace(':', ''), 10);

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 3;  // Default limit to 3 reviews per user
        const skip = (page - 1) * limit;

        const usersCollection = db.collection('users');
        const booksCollection = db.collection('books');

        const usersReview = await usersCollection.aggregate([
            { $match: { _id: userId } },
            { $unwind: "$reviews" },
            { $sort: { "reviews.score": -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: "books", 
                    localField: "reviews.book_id",
                    foreignField: "_id", 
                    as: "book_details"
                }
            },
            { $unwind: "$book_details" },
            {
                $project: {
                    _id: 0,
                    user_id: userId,
                    review: {
                        book_id: "$reviews.book_id",
                        score: "$reviews.score",
                        book: {
                            title: "$book_details.title",
                            isbn: "$book_details.isbn",
                            thumbnail: "$book_details.thumbnailUrl"
                        }
                    }
                }
            },
        ]).toArray();

        const totalReviews = await usersCollection.aggregate([
            { $match: { _id: userId } },
            { $unwind: "$reviews" },
        ]).toArray();
        
        const totalPages = Math.ceil(totalReviews.length / limit);

        if (usersReview.length === 0) {
            return res.status(404).json({ message: "No reviews found for this user" });
        }

        const response = {
            pagination: {
                count: totalReviews.length,
                pages: totalPages,
                currentPage: page,
                next: page < totalPages ? `/api/user/${userId}?page=${page + 1}&limit=${limit}` : null,
                prev: page > 1 ? `/api/user/${userId}?page=${page - 1}&limit=${limit}` : null,
            },
            userId: userId,
            reviews: usersReview.map(item => item.review),
            
        };
        
        res.status(200).json(response);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error retrieving user and top 3 books", error: error.message });
    }
});
router.post('/createusers',async (req,res)=>{
    try{
        const usersCollection = db.collection('users');

         // Retrieve the last user by sorting in descending order by `_id`
        const lastUser = await usersCollection.find().sort({ _id: -1 }).limit(1).toArray();

         // Determine the new user's ID by incrementing the last user's 
        const newUserId = lastUser.length > 0 ? lastUser[0]._id + 1 : 1;
        const newUsers ={
            _id: newUserId,
            first_name: "Nadège",
            last_name: "Storror",
            year_of_birth: 2015,
            job: "Accounting Assistant IV",
            reviews: [
                {
                    book_id: 2,
                    score: 3,
                    recommendation: true,
                    review_date: new Date(1653163712000)
                },
                {
                    book_id: 25,
                    score: 4,
                    recommendation: false,
                    review_date: new Date(1717718933000)
                },
                {
                    book_id: 25,
                    score: 4,
                    recommendation: false,
                    review_date: new Date(1632347207000)
                },
                {
                    book_id: 33,
                    score: 2,
                    recommendation: false,
                    review_date: new Date(1663746778000)
                },
                {
                    book_id: 13,
                    score: 2,
                    recommendation: false,
                    review_date: new Date(1645737451000)
                },
                {
                    book_id: 5,
                    score: 1,
                    recommendation: false,
                    review_date: new Date(1610517569000)
                },
                {
                    book_id: 37,
                    score: 3,
                    recommendation: false,
                    review_date: new Date(1673505211000)
                }
            ]
        }
        const createusers = await booksCollection.inserOne(newUsers) 
    }catch(error){
        res.status(500).json({message:"Error creating books", error: error.message});
    }
})

router.delete('/deleteuser/:id', async (req, res) => {
    try {
        const { id } = req.params; 
        const users_id = parseInt(id.replace(':', ''), 10);
        const userCollection = db.collection('users');
        const deleteusers= userCollection.db.delete({_id: users_id})
        if (deleteusers.result.n === 0) {
            return res.status(404).json({ message: "Livro não encontrado." });
        }
        if(deletebook.result.n === 1) {
            return res.status(204).json({ message: "Livro excluído com sucesso." });  // No Content status code
        }
    } catch (error) {
        res.status(500).json({ message: "Error retrieving book", error: error.message });
    }
});

router.get('/users/job', async (req, res) => {
    try {
        const usersCollection = db.collection('users');

        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10; // Default limit to 10 jobs
        const skip = (page - 1) * limit;

        // Aggregation to count reviews per job
        const jobs = await usersCollection.aggregate([
            { $unwind: "$reviews" }, // Unwind the reviews array
            {
                $group: {
                    _id: "$job",  // Group by job
                    totalreview: { $sum: 1 }  // Count the number of reviews for each job
                }
            },
            { $sort: { totalreview: -1 } },  // Sort by total reviews in descending order
            { $skip: skip }, // Apply pagination
            { $limit: limit }
        ]).toArray(); // Convert the cursor to an array

        // Count total unique jobs
        const totalJobs = await usersCollection.distinct("job");
        const totalPages = Math.ceil(totalJobs.length / limit);

        const response = { 
                pagination: {
                count: totalJobs.length,
                pages: totalPages,
                currentPage: page,
                next: page < totalPages ? `/api/users/job?page=${page + 1}&limit=${limit}` : null,
                prev: page > 1 ? `/api/users/job?page=${page - 1}&limit=${limit}` : null,
            },
            results: jobs           
        };

        res.status(200).json(response);

    } catch (err) {
        res.status(500).json({ err: err.message });
    }
});



export default router