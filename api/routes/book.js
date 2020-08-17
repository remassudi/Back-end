const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const checkAuth = require('../middleware/check-auth');

const Book = require('../models/book');
const ShelfBook = require('../models/shelfBook');
const Shelf = require('../models/shelf');
const User = require('../models/user');
const Review = require('../models/review');
const Rating = require('../models/rating');
const TimelineFeed = require('../models/timelineFeed');

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './uploads/bookImages');
    },
    filename: function(req, file, cb) {
        cb(null, new Date().toISOString() + file.originalname)
    }
});
const fileFilter = (req, file, cb) => {
    if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(new Error('type'), false);
    }
};
const upload = multer({
    storage: storage,
    fileFilter: fileFilter
});

router.post('/advanced_search', (req, res, next) => {
    const perPage = 10;
    const page = parseInt(req.body.page)-1;

    let query = {};
    if (req.body.ISBN != "") {
        query.ISBN = req.body.ISBN;
    }
    if (req.body.name != "") {
        query.name = {'$regex': req.body.name, $options:'i'};
    }
    if (req.body.writer != "") {
        query.writer = {'$regex': req.body.writer, $options:'i'};
    }
    if (req.body.publisher != "") {
        query.publisher = {'$regex': req.body.publisher, $options:'i'};
    }
    if (req.body.translator != "") {
        query.translator = {'$regex': req.body.translator, $options:'i'};
    }
    if (req.body.realName != "") {
        query.realName = {'$regex': req.body.realName, $options:'i'};
    }
    if (req.body.language != "") {
        query.language = req.body.language;
    }

    Book
        .find(query)
        .sort({ _id: -1 })
        .skip(perPage*page)
        .limit(perPage)
        .then(result => {
            Book
                .find(query)
                .count()
                .exec()
                .then(count => {
                    res.status(200).json({
                        result,
                        total: count
                    });
                })
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            })
        });
});

router.post('/quick_search', (req, res, next) => {
    const perPage = 10;
    const page = parseInt(req.body.page)-1;

    let query = [];
    query.push({realName: {'$regex': req.body.searched, $options:'i'}});
    query.push({name: {'$regex': req.body.searched, $options:'i'}});
    query.push({writer: {'$regex': req.body.searched, $options:'i'}});
    query.push({publisher: {'$regex': req.body.searched, $options:'i'}});

    Book
        .find({$or: query})
        .sort({ _id: -1 })
        .skip(perPage*page)
        .limit(perPage)
        .then(result => {
            Book
                .find({$or: query})
                .count()
                .exec()
                .then(count => {
                    res.status(200).json({
                        result,
                        total: count
                    });
                })
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            })
        });
});

router.post('/add_rating', checkAuth, (req, res, next) => {
    let followers = [];
    const timelineFeed = new TimelineFeed({
        _id: new mongoose.Types.ObjectId(),
        user: req.userData.userId,
        kind: "rating",
        r_id: null,
    });
    Rating
        .findOne({user: req.userData.userId, book: req.body.book_id})
        .exec()
        .then(rating => {
            if (rating == null) {
                const newRating = new Rating({
                    _id: new mongoose.Types.ObjectId(),
                    user: req.userData.userId,
                    date: Date.now(),
                    book: req.body.book_id,
                    rate: req.body.rate
                });
                newRating
                    .save()
                    .then(result => {
                        Book
                            .findById(req.body.book_id)
                            .exec()
                            .then(book => {
                                let totalRate = book.totalRating + req.body.rate;
                                let numRate = book.numberRating + 1;
                                let computedRate = totalRate / numRate;

                                Book
                                    .updateOne({_id: req.body.book_id}, {
                                        "$set": {
                                            "totalRating": totalRate,
                                            "numberRating": numRate,
                                            "computedRating": computedRate
                                        }
                                    })
                                    .exec()
                                    .then(result => {
                                        User
                                            .updateOne({_id: req.userData.userId}, {$push: {"ratings": newRating._id}})
                                            .exec()
                                            .then(result => {
                                                User
                                                    .findOne({_id: req.userData.userId})
                                                    .exec()
                                                    .then(user => {
                                                        followers = user.followers;
                                                        if (followers.length == 0) {
                                                            res.status(201).json({
                                                                message: 'review added',
                                                                id: newRating._id
                                                            });
                                                        } else {
                                                            timelineFeed.r_id = newRating._id;
                                                            timelineFeed
                                                                .save()
                                                                .then(result => {
                                                                    User
                                                                        .updateMany({_id: {$in: followers}}, {$push: {"timeline": timelineFeed._id}})
                                                                        .exec()
                                                                        .then(result => {
                                                                            res.status(201).json({
                                                                                message: 'review added',
                                                                                id: newRating._id
                                                                            });
                                                                        })
                                                                        .catch(err => {
                                                                            res.status(500).json({
                                                                                error: err
                                                                            })
                                                                        });
                                                                })
                                                                .catch(err => {
                                                                    res.status(500).json({
                                                                        error: err
                                                                    })
                                                                });
                                                        }
                                                    })
                                                    .catch(err => {
                                                        res.status(500).json({
                                                            error: err
                                                        })
                                                    });
                                            })
                                            .catch(err => {
                                                res.status(500).json({
                                                    error: err
                                                })
                                            });
                                    })
                                    .catch(err => {
                                        res.status(500).json({
                                            error: err
                                        })
                                    });
                            })
                            .catch(err => {
                                console.log(err);
                                res.status(500).json({
                                    error: err
                                })
                            });
                    })
                    .catch(err => {
                        console.log(err);
                        res.status(500).json({
                            error: err
                        })
                    });
            } else {
                Book
                    .findById(req.body.book_id)
                    .exec()
                    .then(book => {
                        let totalRate = book.totalRating - rating.rate + req.body.rate;
                        let numRate = book.numberRating;
                        let computedRate = totalRate / numRate;

                        Book
                            .updateOne({_id: book._id}, {
                                "$set": {
                                    "totalRating": totalRate,
                                    "computedRating": computedRate
                                }
                            })
                            .exec()
                            .then(result => {
                                Rating
                                    .updateOne({_id: rating._id}, {rate: req.body.rate})
                                    .exec()
                                    .then(result => {
                                        res.status(201).json({
                                            message: 'rating changed',
                                            id: rating._id
                                        });
                                    })
                                    .catch(err => {
                                        res.status(500).json({
                                            error: err
                                        })
                                    });
                            })
                            .catch(err => {
                                res.status(500).json({
                                    error: err
                                })
                            });
                    })
                    .catch(err => {
                        console.log(err);
                        res.status(500).json({
                            error: err
                        })
                    });
            }
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            })
        })
});

router.post('/add_review', checkAuth, (req, res, next) => {
    let followers = [];
    const review = new Review({
        _id: new mongoose.Types.ObjectId(),
        user: req.userData.userId,
        date: Date.now(),
        book: req.body.book_id,
        review: req.body.review,
        title: req.body.title
    });
    const timelineFeed = new TimelineFeed({
        _id: new mongoose.Types.ObjectId(),
        user: req.userData.userId,
        kind: "review",
        r_id: review._id,
    });
    review
        .save()
        .then(result => {
            Book
                .updateOne({_id: req.body.book_id}, {$push: {"reviews": review._id}})
                .exec()
                .then(result => {
                    User
                        .updateOne({_id: req.userData.userId}, {$push: {"reviews": review._id}})
                        .exec()
                        .then(result => {
                            User
                                .findOne({_id: req.userData.userId})
                                .exec()
                                .then(user => {
                                    followers = user.followers;
                                    if (followers.length == 0) {
                                        res.status(201).json({
                                            message: 'review added'
                                        });
                                    } else {
                                        timelineFeed
                                            .save()
                                            .then(result => {
                                                User
                                                    .updateMany({_id: {$in: followers}}, {$push: {"timeline": timelineFeed._id}})
                                                    .exec()
                                                    .then(result => {
                                                        res.status(201).json({
                                                            message: 'review added'
                                                        });
                                                    })
                                                    .catch(err => {
                                                        res.status(500).json({
                                                            error: err
                                                        })
                                                    });
                                            })
                                            .catch(err => {
                                                res.status(500).json({
                                                    error: err
                                                })
                                            });
                                    }
                                })
                                .catch(err => {
                                    res.status(500).json({
                                        error: err
                                    })
                                });
                        })
                        .catch(err => {
                            res.status(500).json({
                                error: err
                            })
                        });
                })
                .catch(err => {
                    console.log(err);
                    res.status(500).json({
                        error: err
                    })
                });
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            })
        });
})

router.post('/remove_book_fromShelf', checkAuth, (req, res, next) => {
    Shelf.updateOne({_id: req.body.shelf_id}, {$pull: {"books": req.body.book_id}})
        .exec().then(result => {
        ShelfBook.deleteOne({_id: req.body.book_id})
            .exec().then(result => {
            res.status(200).json({
                message: 'book removed'
            })
        })
            .catch(err => {
                console.log(err);
                res.status(500).json({
                    message: 'book not removed'
                })
            });
    })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                message: 'book not removed'
            })
        });
});

router.post('/add_book_toShelf', checkAuth, (req, res, next) => {
    const shelfBook = new ShelfBook({
        _id: new mongoose.Types.ObjectId(),
        user: req.userData.userId,
        added_at: Date.now(),
        book: req.body.book_id,
        shelf: req.body.shelf_id
    });
    shelfBook
        .save()
        .then(result => {
            Shelf
                .updateOne({_id: req.body.shelf_id}, {$push: {"books": shelfBook._id}})
                .exec()
                .then(result => {
                    res.status(201).json({
                        id: shelfBook._id,
                        message: 'book added to shelf'
                    });
                })
                .catch(err => {
                    console.log(err);
                    res.status(500).json({
                        error: err
                    })
                });
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            })
        });
});

router.post('/add_book', checkAuth, upload.single('bookImage'), (req, res, next) => {
    Book
        .find({ISBN: req.body.isbn})
        .exec()
        .then(book => {
            if (book.length >= 1) {
                return res.status(409).json({
                    error: 'book exists'
                });
            } else {
                const book = new Book({
                    _id: new mongoose.Types.ObjectId(),
                    ISBN: req.body.isbn,
                    name: req.body.name,
                    writer: req.body.writer,
                    language: req.body.language,
                    publisher: req.body.publisher,
                    page: req.body.page,
                    translator: req.body.translator,
                    realName: req.body.realName,
                    summary: req.body.summary
                });

                book
                    .save()
                    .then(result => {
                        // console.log(result);
                        res.status(201).json({
                            message: 'book added',
                            id: book._id
                        });
                        if (req.file != null) {
                            Book.updateOne({ISBN: req.body.isbn}, {$set: {bookImage: req.file.path}}).exec()
                        }
                    })
                    .catch(err => {
                        console.log(err);
                        res.status(500).json({
                            error: err
                        })
                    });
            }
        })
});

router.post('/edit_book', checkAuth, upload.single('bookImage'), (req, res, next) => {
    const id = req.body.book_id;
    const updateOps = {};
    if (req.body.name != null) {
        updateOps["name"] = req.body.name;
    }
    if (req.body.writer != null) {
        updateOps["writer"] = req.body.writer;
    }
    if (req.body.language != null) {
        updateOps["language"] = req.body.language;
    }
    if (req.body.publisher != null) {
        updateOps["publisher"] = req.body.publisher;
    }
    if (req.body.page != null) {
        updateOps["page"] = req.body.page;
    }
    if (req.body.translator != null) {
        updateOps["translator"] = req.body.translator;
    }
    if (req.body.realName != null) {
        updateOps["realName"] = req.body.realName;
    }
    if (req.body.summary != null) {
        updateOps["summary"] = req.body.summary;
    }
    if (req.file != null) {
        updateOps["bookImage"] = req.file.path;
    }

    Book
        .update({_id: id}, {$set: updateOps})
        .exec()
        .then(result => {
            // console.log(result);
            res.status(200).json({
                message: 'book updated'
            });
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            })
        });
});

router.get('/get_bookInfo/:bookId', checkAuth, (req, res, next) => {
    const id = req.params.bookId;

    Book
        .findById(id)
        .select('name ISBN _id writer language publisher page translator summary bookImage realName')
        .exec()
        .then(doc => {
            // console.log(doc);
            if (doc) {
                res.status(200).json({
                    book: doc
                });
            } else {
                res.status(404).json({
                    message: "no valid entry for ID"
                });
            }
        })
        .catch(err => {
            console.log(err)
            res.status(500).json({
                error: err
            });
        });
});

router.get('/get_book/:bookId', (req, res, next) => {
    const id = req.params.bookId;
    let userData = null;

    if (req.headers.authorization != null) {
        const token = req.headers.authorization.split(' ')[1];
        userData = jwt.verify(token, "secret");
    }

    Book
        .findById(id)
        .select('name ISBN _id writer language publisher page translator summary bookImage realName computedRating reviews')
        .populate({
            path: 'reviews',
            select: 'user review _id date title',
            populate: [
                {path: 'user', select: 'name familyName profileImage'}
            ]
        })
        .exec()
        .then(doc => {
            // console.log(doc);
            if (doc) {
                if (userData != null) {
                    const user_id = userData.userId;
                    ShelfBook
                        .find({user: user_id, book: id})
                        .select('_id shelf')
                        .populate('shelf', '_id name')
                        .exec()
                        .then(shelfBook => {
                            Rating
                                .find({user: user_id, book: id})
                                .select('_id rate')
                                .exec()
                                .then(rating => {
                                    res.status(200).json({
                                        book: doc,
                                        shelf: shelfBook,
                                        rate: rating
                                    });
                                })
                                .catch(err => {
                                    console.log(err)
                                    res.status(500).json({error: err});
                                });
                        })
                        .catch(err => {
                            console.log(err)
                            res.status(500).json({error: err});
                        });
                } else {
                    res.status(200).json({
                        book: doc
                    });
                }
            } else {
                res.status(404).json({
                    message: "no valid entry for ID"
                });
            }
        })
        .catch(err => {
            console.log(err)
            res.status(500).json({
                error: err
            });
        });
});

router.post('/get_books', (req, res, next) => {
    const perPage = 10;
    const page = parseInt(req.body.page)-1;

    Book
        .find()
        .sort({ _id: -1 })
        .skip(perPage*page)
        .limit(perPage)
        .select('name _id writer publisher translator bookImage computedRating')
        .exec()
        .then(doc => {
            Book
                .countDocuments()
                .exec()
                .then(count => {
                    res.status(200).json({
                        doc,
                        total: count
                    });
                })
            // console.log(doc);
        })
        .catch(err => {
            console.log(err)
            res.status(500).json({
                error: err
            });
        });
});

module.exports = router;