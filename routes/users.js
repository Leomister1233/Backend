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

//Lista de users com paginação.
//Get localhost:3000/api/users/getusers

router.get("/getusers", async (req, res) => {
    try {
        const usersCollection = db.collection("users");
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const users = await usersCollection.find({}).skip(skip).limit(limit).toArray();
        const totalUsers = await usersCollection.countDocuments(); // Optional: total count for pagination info

        const totalPages = Math.ceil(totalUsers / limit);

        const response = {
            pagination: {
                next: page < totalPages ? `/api/users/getusers?page=${page + 1}&limit=${limit}` : null,
                prev: page > 1 ? `/api/users/getusers?page=${page - 1}&limit=${limit}` : null,
            },
            totalUsers,
            totalPages,
            currentPage: page,
            users,
            
        };

        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving users", error: error.message });
    }
});

//Pesquisar pelo _id(users)
 //Get localhost:3000/api/users/user/:id

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

//testing something please ignore
router.get('/usersid',async (req, res) => {
    try{
        const usersCollection = db.collection('users');

        const lastUser = await usersCollection.find({}, { projection: { _id: 1 } })
            .sort({ _id: -1 })
            .limit(1)
            .toArray();
        
        if (lastUser.length > 0) {
            
            res.status(200).json(lastUser[0]._id+1);
        } else {
            res.status(404).json({ message: "No users found" });
        }
    }catch(err){
        res.status(500).json({ message: "Error retrieving"})
    }
})

//Adicionar 1 ou vários utilizadores. 
//Post localhost:3000/api/users/createusers

router.post('/createusers', async (req, res) => {
    try {
        const usersCollection = db.collection('users');
        
        const lastUser = await usersCollection.find({}, { projection: { _id: 1 } })
            .sort({ _id: -1 })
            .limit(1)
            .toArray();
        
        let newUserId = lastUser.length > 0 ? lastUser[0]._id + 1 : 1;  
        //examplo de um novo user
        const newUser = {
            _id: newUserId,
            first_name: "John",  
            last_name: "Doe",    
            year_of_birth: 1990, 
            job: "Software Engineer", 
            reviews: [
                {
                    book_id: 10,   
                    score: 5,      
                    recommendation: true, 
                    review_date: new Date()  
                },
                {
                    book_id: 20,   
                    score: 4,     
                    recommendation: false, 
                    review_date: new Date()  
                }
               
            ]
        };

        const createUser = await usersCollection.insertOne(newUser);

        res.status(201).json({
            message: "User created successfully",
            user: createUser.ops ? createUser.ops[0] : { _id: createUser.insertedId, ...newUser }  
        });

    } catch (error) {
        console.error(error);  
        res.status(500).json({ message: "Error creating user", error: error.message });
    }
});

//Remover user pelo _id 
//Delete localhost:3000/api/users/deleteuser/:id

router.delete('/deleteuser/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = parseInt(id.replace(':', ''), 10); 
        const userCollection = db.collection('users');

      
        const deleteResult = await userCollection.deleteOne({ _id: userId });

        if (deleteResult.deletedCount === 0) {
            return res.status(404).json({ message: "User not found." });
        }

        return res.status(200).json({ message: "User deleted successfully." });
    } catch (error) {
        console.error(error); 
        res.status(500).json({ message: "Error deleting user", error: error.message });
    }
});


//Número total de reviews por “job”
//GET localhost:3000/api/users/users/job

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

//Update user
//PUT localhost:3000/api/users/:id

router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const userId = parseInt(id.replace(':', ''), 10); 
    console.log(userId)
    const updatedData = req.body;

    try {
      const result = await db.collection("users").updateOne(
        { _id: userId },
        { $set: updatedData }
      );
      if (result.matchedCount === 0) {
        return res.status(404).send({ message: "User não encontrado" });
      }
      res.status(200).send({ message: "User atualizado com sucesso", result });
    } catch (error) {
      res.status(500).send({ error: "Erro ao atualizar o user", details: error });
    }
  });

export default router