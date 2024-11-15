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

        res.status(200).json({
            totalUsers,
            totalPages: Math.ceil(totalUsers / limit),
            currentPage: page,
            users,
        });
    } catch (error) {
        res.status(500).json({ message: "Error retrieving users", error: error.message });
    }
});

router.get('/user/:id', async (req, res) => {
    try {
        const { id } = req.params; 
        const userId = parseInt(id.replace(':', ''), 10);// Use ObjectId for MongoDB _id

        console.log("User ID:", userId); // Log the userId to make sure it's correct

        const usersCollection = db.collection('users');
        const booksCollection = db.collection('books');

        const usersReview = await usersCollection.aggregate([
            {
                $match:{_id: userId}
            },
            {
                $unwind:"$reviews"
            },
            {
                $sort:{"reviews.score":-1}    
            },
            {
                $limit:3
            },
            {
                $lookup: {
                    from: "books", // Join the books collection
                    localField: "reviews.book_id", // Match the book_id from reviews
                    foreignField: "_id", // Match it to the book's _id
                    as: "book_details" // Output the matched books as `book_details`
                }
            },
            {
                $unwind: "$book_details" // Unwind the book details array (one book per review)
            },
            {
                $project:{
                    _id: 0,
                    user_id: userId, 
                    review: { // Combine the review and book details into one object
                        book_id: "$reviews.book_id", // Include book_id from review
                        score: "$reviews.score", // Include score from review
                        book: { // Create a book object
                            title: "$book_details.title", // Include book title
                            isbn: "$book_details.isbn", // Include book ISBN
                            thumbnail: "$book_details.thumbnailUrl" // Include book thumbnail
                        } 
                    }
                }
            },
        
        ]).toArray();

        if (usersReview.length === 0) {
            return res.status(404).json({ message: "No reviews found for this user" });
        }

        // Format the response
        const response = {
            userId: userId,
            reviews: usersReview.map(item => item.review) // Map the reviews to a simpler structure
        };
        res.status(200).json(response); // Return the top 3 books with their details

    } catch (error) {
        console.error(error); // Log the full error to debug
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
        const users = db.collection('users');

        // Aggregation to count reviews per job
        const jobs = await users.aggregate([
            {
                $unwind: "$reviews"  // Unwind the reviews array
            },
            {
                $group: {
                    _id: "$job",  // Group by job
                    totalreview: { $sum: 1 }  // Count the number of reviews for each job
                }
            },
            {
                $sort: { totalreview: -1 }  // Sort by total reviews in descending order
            }
        ]).toArray();  // Convert the cursor to an array

        // Proper response object
        const response = {
            results: jobs
        };

        res.status(200).json(response);

    } catch (err) {
        res.status(500).json({ err: err.message });
    }
});


export default router