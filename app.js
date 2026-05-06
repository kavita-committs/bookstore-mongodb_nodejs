                
                require('dotenv').config();
                const jwt = require('jsonwebtoken');
                const express = require('express');
                const { connectToDb, getDb } = require('./db');
                const { authMiddleware } = require('./middleware');
                const multer = require('multer');
                const { v2: cloudinary } = require('cloudinary');
                const { CloudinaryStorage } = require('multer-storage-cloudinary');
                const app = express();
                app.use(express.json());

                // Cloudinary config
            cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
          });

          // Storage config
            const storage = new CloudinaryStorage({
              cloudinary: cloudinary,
              params: {
                folder: "bookstore",
                resource_type: "auto"
              }
            });

          const upload = multer({ storage });

          // Upload API
    app.post('/upload', upload.single('file'), async (req, res) => {
  try {

   // console.log("Uploaded File 👉", req.file);

    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded"
      });
    }

    const db = getDb();

    const fileData = {
      fileName: req.file.originalname,
        path: req.file.path,
      uploadedAt: new Date()
    };

    const result = await db.collection('files').insertOne(fileData);

    res.status(201).json({
      message: "File uploaded successfully",
      data: {
        _id: result.insertedId,
        ...fileData
      }
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// .................Local folder upload.............................................................

             // Storage config
                            
        //       const localStorage = multer.diskStorage({
        //         destination: function(req, file, cb) {
        //           cb(null, "uploads/");
        //         },
        //         filename: function(req, file, cb) {
        //           cb(null, Date.now() + "-" + file.originalname);
        //         }
        //       });

        //       const localUpload = multer({
        //         storage: localStorage
        //       });

        //          // Upload file api
                    
        //           app.post('/upload-local', authMiddleware, localUpload.single('file'), async (req, res) => {
        //   try {

        //     const db = getDb();

        //     // Save file info in MongoDB
        //     const result = await db.collection('files').insertOne({
        //       fileName: req.file.filename,
        //       originalName: req.file.originalname,
        //       path: req.file.path,
        //       uploadedAt: new Date()
        //     });

        //     res.status(201).json({
        //       message: "File uploaded successfully",
        //       data: {
        //         _id: result.insertedId,
        //         file: req.file.filename
        //       }
        //     });

        //   } catch (err) {
        //     res.status(500).json({
        //       error: err.message
        //     });
        //   }
        // });
//---------------------------------------------------------------------------------------------------
                // sign up api

                const bcrypt = require('bcryptjs');

              app.post('/signup', async (req, res) => {
                try {
                  const db = getDb();
                  const { email, password } = req.body;

                  if (!email || !password) {
                    return res.status(400).json({ error: "Email & password required" });
                  }

                  const existingUser = await db.collection('users').findOne({ email });

                  if (existingUser) {
                    return res.status(400).json({ error: "User already exists" });
                  }

                  const hashedPassword = await bcrypt.hash(password, 10);

                  const result = await db.collection('users').insertOne({
                    email,
                    password: hashedPassword
                  });

                  res.status(201).json({
                    message: "User created",
                    userId: result.insertedId
                  });

                } catch (err) {
                  res.status(500).json({ error: err.message });
                }
              });


              // login api
              app.post('/login', async (req, res) => {
                try {
                  const db = getDb();
                  const { email, password } = req.body;

                  const user = await db.collection('users').findOne({ email });

                  if (!user) {
                    return res.status(400).json({ error: "Invalid credentials" });
                  }

                  const isMatch = await bcrypt.compare(password, user.password);

                  if (!isMatch) {
                    return res.status(400).json({ error: "Invalid credentials" });
                  }

                  //  Create token
                  const token = jwt.sign(
                    { userId: user._id, email: user.email },
                    process.env.JWT_SECRET,
                    { expiresIn: "1h" }
                  );

                  res.json({
                    message: "Login successful",
                    token
                  });

                } catch (err) {
                  res.status(500).json({ error: err.message });
                }
              });


              // filter with genre, title , author

              app.get('/books', async (req, res) => {
            try {
              const db = getDb();

              const { genre, title, author } = req.query;

              let query = {};

              // Filter by genre (array field)
              if (genre) {
                query.genres = genre;
              }

              // Search by title (case insensitive)
              if (title) {
                query.title = {
                  $regex: title,
                  $options: "i"  // i for case sensitive search
                };
              }

              // Search by author (case insensitive)
              if (author) {
                query.author = {
                  $regex: author,
                  $options: "i"
                };
              }

              const books = await db.collection('books')
                .find(query)
                .toArray();

              res.status(200).json({
                count: books.length,
                data: books
              });

            } catch (err) {
              res.status(500).json({
                error: err.message
              });
            }
          });

                //   get all books
                app.get('/books', authMiddleware, async (req, res) => {
                  try {
                    const db = getDb();

                    const books = await db.collection('books').find().toArray();

                  // res.json(books);
                  res.json( { Books : books})
                  } catch (err) {
                    res.status(500).json({ error: err.message });
                  }
                });


                // post book

                app.post('/books', authMiddleware, async (req, res) => {
                  try {
                    const db = getDb();

                    const result = await db.collection('books').insertOne(req.body);

                      res.status(201).json({
                      message: "Book created successfully",
                      data: {
                        _id: result.insertedId,
                        ...req.body
                      }
                    });
                  // res.status(201).json(result);
                  } catch (err) {
                    res.status(500).json({ error: err.message });
                  }
                });
            // update bulk api

            app.put('/books/bulk', async (req, res) => {
              try {
                const db = getDb();
                const updates = req.body;

                // Validate input
                if (!Array.isArray(updates) || updates.length === 0) {
                  return res.status(400).json({
                    error: "Send array of books"
                  });
                }

                const operations = [];
                const validIds = [];

                for (let item of updates) {

                  // Skip invalid ids
                  if (!item._id || !ObjectId.isValid(item._id)) {
                    continue;
                  }

                  const objectId = new ObjectId(item._id);

                  validIds.push(objectId);

                  operations.push({
                    updateOne: {
                      filter: { _id: objectId },
                      update: {
                        $set: {
                          title: item.title,
                          author: item.author,
                          pages: Number(item.pages) || 0,
                          genres: item.genres || []
                        }
                      }
                    }
                  });
                }

                if (operations.length === 0) {
                  return res.status(400).json({
                    error: "No valid IDs found"
                  });
                }

                // Step 1: Update
                await db.collection('books').bulkWrite(operations);

                // Step 2: Fetch updated books
                const updatedBooks = await db.collection('books')
                  .find({
                    _id: { $in: validIds }
                  })
                  .toArray();

                res.status(200).json({
                  message: "Bulk update successful",
                  count: updatedBooks.length,
                  data: updatedBooks
                });

              } catch (err) {
                res.status(500).json({
                  error: err.message
                });
              }
            });




                //update data

                const { ObjectId } = require('mongodb');

                app.put('/books/:id', authMiddleware, async (req, res) => {
                  try {
                    const db = getDb();

                    const result = await db.collection('books').updateOne(
                      { _id: new ObjectId(req.params.id) },
                      { $set: req.body }
                    );

                  // res.json(result);

                    res.status(201).json({
                      message: "Book updated successfully",
                      data: {
                      // _id: result.insertedId,
                        ...req.body
                      }
                    });
                  } catch (err) {
                    res.status(500).json({ error: err.message });
                  }
                });


                // delete bulk data at a time

              app.delete('/books/bulk', authMiddleware, async (req, res) => {
                try {
                  const db = getDb();
                  const ids = req.body.ids;

                  // 👉 check input
                  if (!ids || !Array.isArray(ids)) {
                    return res.json({ error: "Send ids as array" });
                  }

                  let objectIds = [];

                  //  convert only valid ids
                  for (let i = 0; i < ids.length; i++) {
                    if (ObjectId.isValid(ids[i])) {
                      objectIds.push(new ObjectId(ids[i]));
                    }
                  }

                  const result = await db.collection('books').deleteMany({
                    _id: { $in: objectIds }
                  });

                  res.json({
                    message: "Deleted successfully",
                    deletedCount: result.deletedCount
                  });

                } catch (err) {
                  res.json({ error: err.message });
                }
              });


                //delete data...................
                app.delete('/books/:id', authMiddleware, async (req, res) => {
                  try {
                    const db = getDb();

                    const result = await db.collection('books').deleteOne({
                      _id: new ObjectId(req.params.id)
                    });

                    res.json(result);
                  } catch (err) {
                    res.status(500).json({ error: err.message });
                  }
                });

              // get books by id
                app.get('/books/:id', authMiddleware, async (req, res) => {
                try {
                  const db = getDb();
                  const { ObjectId } = require('mongodb');

                  if (!ObjectId.isValid(req.params.id)) {
                    return res.status(400).json({ error: "Invalid ID" });
                  }

                  const book = await db.collection('books').findOne({
                    _id: new ObjectId(req.params.id)
                  });

                  if (!book) {
                    return res.status(404).json({ error: "Book not found" });
                  }

                  res.json(book);

                } catch (err) {
                  res.status(500).json({ error: err.message });
                }
              });

              // add books in bulk

              app.post('/books/bulk', authMiddleware, async (req, res) => {
                try {
                  const db = getDb();

                  const books = req.body;

                  // Validate request body
                  if (!Array.isArray(books) || books.length === 0) {
                    return res.status(400).json({
                      error: "Request body must be a non-empty array of books"
                    });
                  }

                  //  Validate each book
                  const validBooks = books.map((book, index) => {
                    const { title, author, pages, genres } = book;

                    if (!title || !author) {
                      throw new Error(`Missing title/author at index ${index}`);
                    }

                    return {
                      title,
                      author,
                      pages: Number(pages) || 0,
                      genres: Array.isArray(genres) ? genres : []
                    };
                  });

                  //  Insert into MongoDB
                  const result = await db.collection('books').insertMany(validBooks);

                  res.status(201).json({
                    message: "Bulk insert successful",
                    insertedCount: result.insertedCount,
                    insertedIds: result.insertedIds
                  });

                } catch (err) {
                  res.status(500).json({
                    error: err.message
                  });
                }
              });
                // 
                connectToDb().then(() => {
                  app.listen(3000, () => {
                    console.log("Server running on port 3000");
                  });
                });