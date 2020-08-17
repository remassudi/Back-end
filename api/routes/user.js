const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const checkAuth = require('../middleware/check-auth');

const User = require('../models/user');
const Shelf = require('../models/shelf');
const ShelfBook = require('../models/shelfBook');
const TimelineFeed = require('../models/timelineFeed');
const Rating = require('../models/rating');
const Review = require('../models/review');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/profileImages');
    },
    filename: function (req, file, cb) {
        cb(null, new Date().getTime().toString() + file.originalname)
    }
});
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(new Error('type'), false);
    }
};
const upload = multer({
    storage: storage,
    fileFilter: fileFilter
});

router.post('/timeline', checkAuth, async (req, res, next) => {
    let feeds = [], timeline = [];
    const perPage = 10;
    const page = parseInt(req.body.page)-1;
    User
        .findOne({_id: req.userData.userId})
        .exec()
        .then(async user => {
            timeline = user.timeline;
            let length = page*perPage + perPage;
            if (length > timeline.length) {
                length = timeline.length;
            }
            let i;
            for (i = page*perPage; i < length; i++) {
                await TimelineFeed
                    .findOne({_id: timeline[i]})
                    .exec()
                    .then(async feed => {
                        if (feed.kind == "rating") {
                            await Rating
                                .findOne({_id: feed.r_id})
                                .select('user book _id rate date')
                                .populate('book', 'name _id writer bookImage computedRating')
                                .populate('user', 'name _id familyName profileImage')
                                .exec()
                                .then(rate => {
                                    let new_feed = {rate};
                                    new_feed.kind = feed.kind;
                                    feeds.push(new_feed);
                                })
                        } else {
                            await Review
                                .findOne({_id: feed.r_id})
                                .select('user book _id title review date')
                                .populate('book', 'name _id writer bookImage computedRating')
                                .populate('user', 'name _id familyName profileImage')
                                .exec()
                                .then(review => {
                                    let new_feed = {review};
                                    new_feed.kind = feed.kind;
                                    feeds.push(new_feed);
                                })
                        }
                    })
            }
        })
        .then(result => {
            res.status(200).json({
                feeds,
                total: timeline.length
            })
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            })
        });
});

router.post('/unfollow', checkAuth, (req, res, next) => {
    User.updateOne({_id: req.userData.userId}, {$pull: {"followings": req.body.following_id}})
        .exec().then(result => {
        User.updateOne({_id: req.body.following_id}, {$pull: {"followers": req.userData.userId}})
            .exec().then(result => {
            res.status(200).json({
                message: 'user unfollowed'
            })
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
});

router.post('/follow', checkAuth, (req, res, next) => {
    User.updateOne({_id: req.userData.userId}, {$push: {"followings": req.body.following_id}})
        .exec().then(result => {
        User.updateOne({_id: req.body.following_id}, {$push: {"followers": req.userData.userId}})
            .exec().then(result => {
            res.status(200).json({
                message: 'user followed'
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
});

router.post('/remove_shelf', checkAuth, (req, res, next) => {
    User.updateOne({_id: req.userData.userId}, {$pull: {"shelves": req.body.shelf_id}})
        .exec().then(result => {
        Shelf.deleteOne({_id: req.body.shelf_id})
            .exec().then(result => {
            res.status(200).json({
                message: 'shelf removed'
            })
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
});

router.post('/create_shelf', checkAuth, (req, res, next) => {
    const newShelf = new Shelf({
        _id: new mongoose.Types.ObjectId(),
        user: req.userData.userId,
        name: req.body.name
    });
    newShelf.save()
        .then(result => {
            User.updateOne({_id: req.userData.userId}, {$push: {"shelves": newShelf._id}})
                .exec().then(result => {
                res.status(201).json({
                    message: 'shelf created'
                });
            })
                .catch(err => {
                    // console.log(err);
                    res.status(500).json({
                        error: err
                    })
                });
        })
        .catch(err => {
            // console.log(err);
            res.status(500).json({
                error: err
            })
        });
});

router.post('/get_shelf', (req, res, next) => {
    if (req.body.shelf_id == 'all') {
        let id = null;
        if (req.headers.authorization != null) {
            const token = req.headers.authorization.split(' ')[1];
            id = jwt.verify(token, "secret").userId;
        }

        ShelfBook
            .find({user: id})
            .select('added_at book _id')
            .populate('book', 'name _id writer publisher language bookImage')
            .exec()
            .then(doc => {
                if (doc) {
                    res.status(200).json({
                        count: doc.length,
                        shelf: doc
                    });
                } else {
                    res.status(404).json({message: "no valid entry for ID"});
                }
            })
            .catch(err => {
                console.log(err)
                res.status(500).json({error: err});
            });
    } else {
        Shelf
            .findById(req.body.shelf_id)
            .select('name _id books')
            .populate({
                path: 'books',
                select: '_id book',
                populate: [
                    {path: 'book', select: 'name _id writer publisher language bookImage'}
                ]
            })
            .exec()
            .then(doc => {
                // console.log(doc);
                if (doc) {
                    res.status(200).json({
                        count: doc.length,
                        shelf: doc
                    });
                } else {
                    res.status(404).json({message: "no valid entry for ID"});
                }
            })
            .catch(err => {
                console.log(err)
                res.status(500).json({error: err});
            });
    }
});

router.get('/get_shelfList', checkAuth, (req, res, next) => {
    const id = req.userData.userId;
    User
        .findById(id)
        .select('shelves')
        .populate('shelves', 'name _id')
        .exec()
        .then(doc => {
            // console.log(doc);
            if (doc) {
                res.status(200).json({
                    shelves: doc
                });
            } else {
                res.status(404).json({message: "no valid entry for ID"});
            }
        })
        .catch(err => {
            console.log(err)
            res.status(500).json({error: err});
        });
});

router.get('/get_userInfo', checkAuth, (req, res, next) => {
    const id = req.userData.userId;
    User.findById(id)
        .select('name familyName birthDate birthMonth birthYear biography profileImage')
        .exec().then(doc => {
        // console.log(doc);
        if (doc) {
            res.status(200).json({
                user: doc
            });
        } else {
            res.status(404).json({message: "no valid entry for ID"});
        }
    })
        .catch(err => {
            console.log(err)
            res.status(500).json({error: err});
        });
});

router.get('/get_userProfile/:userId', (req, res, next) => {
    const id = req.params.userId;
    let userData = null;

    if (req.headers.authorization != null) {
        const token = req.headers.authorization.split(' ')[1];
        userData = jwt.verify(token, "secret");
    }

    User
        .findById(id)
        .select('name familyName birthDate birthMonth birthYear biography profileImage ratings reviews shelves followers followings')
        .populate({
            path: 'ratings',
            select: 'book rate date',
            populate: [
                {path: 'book', select: 'name'}
            ]
        })
        .populate({
            path: 'reviews',
            select: 'book review date title',
            populate: [
                {path: 'book', select: 'name _id bookImage'}
            ]
        })
        .populate({
            path: 'shelves',
            select: '_id name'
        })
        .populate('followers', 'name _id familyName profileImage')
        .populate('followings', 'name _id familyName profileImage')
        .exec()
        .then(doc => {
            // console.log(doc);
            if (doc) {
                if (userData != null) {
                    let followed = false, i, userID = userData.userId;
                    for (i = 0; i < doc.followers.length; i++) {
                        if (doc.followers[i].id == userID) {
                            followed = true;
                            break;
                        }
                    }
                    res.status(200).json({
                        user: doc,
                        followed: followed
                    });
                } else {
                    res.status(200).json({
                        user: doc,
                        followed: "login"
                    });
                }
            } else {
                res.status(404).json({message: "no valid entry for ID"});
            }
        })
        .catch(err => {
            console.log(err)
            res.status(500).json({error: err});
        });
});

router.post('/edit_profile', checkAuth, upload.single('profileImage'), (req, res, next) => {
    const id = req.userData.userId;
    const updateOps = {};
    if (req.body.name != '') {
        updateOps["name"] = req.body.name;
    }
    if (req.body.familyName != '') {
        updateOps["familyName"] = req.body.familyName;
    }
    if (req.body.birthDate != '') {
        updateOps["birthDate"] = req.body.birthDate;
    }
    if (req.body.birthMonth != '') {
        updateOps["birthMonth"] = req.body.birthMonth;
    }
    if (req.body.birthYear != '') {
        updateOps["birthYear"] = req.body.birthYear;
    }
    if (req.body.biography != '') {
        updateOps["biography"] = req.body.biography;
    }
    if (req.file != null) {
        updateOps["profileImage"] = req.file.path;
    }

    User
        .update({_id: id}, {$set: updateOps})
        .exec()
        .then(result => {
            User
                .findOne({_id: id})
                .select('name email _id familyName profileImage')
                .exec()
                .then(result => {
                    res.status(200).json({
                        message: 'user updated',
                        user: result
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

router.post('/change_pass', checkAuth, (req, res, next) => {
    const id = req.userData.userId;

    User
        .findOne({_id: id})
        .exec()
        .then(user => {
            bcrypt
                .compare(req.body.password, user.password, (err, result) => {
                    if (err) {
                        return res.status(400).json({
                            error: "auth failed"
                        });
                    }
                    if (result) {
                        bcrypt
                            .hash(req.body.newPassword, 10, (err, hash) => {
                                if (err) {
                                    return res.status(500).json({
                                        error: err
                                    });
                                } else {
                                    User
                                        .updateOne({_id: id}, {password: hash})
                                        .exec()
                                        .then(result => {
                                            // console.log(result);
                                            res.status(200).json({
                                                message: 'pass changed'
                                            });
                                        })
                                        .catch(err => {
                                            // console.log(err);
                                            res.status(500).json({
                                                error: err
                                            })
                                        });
                                }
                            });
                    }
                });
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            })
        });
});

router.post('/signup', (req, res, next) => {
    User
        .find({email: req.body.email})
        .exec()
        .then(user => {
            if (user.length >= 1) {
                return res.status(409).json({
                    error: 'username exists'
                });
            } else {
                bcrypt
                    .hash(req.body.password, 10, (err, hash) => {
                        if (err) {
                            return res.status(500).json({
                                error: err
                            });
                        } else {
                            const user = new User({
                                _id: new mongoose.Types.ObjectId(),
                                password: hash,
                                email: req.body.email,
                                shelves: []
                            });
                            const likedShelf = new Shelf({
                                _id: new mongoose.Types.ObjectId(),
                                user: user._id,
                                name: "کتاب‌های مورد علاقه"
                            });
                            likedShelf
                                .save();
                            const readingShelf = new Shelf({
                                _id: new mongoose.Types.ObjectId(),
                                user: user._id,
                                name: "در حال خواندن"
                            });
                            readingShelf
                                .save();
                            const readShelf = new Shelf({
                                _id: new mongoose.Types.ObjectId(),
                                user: user._id,
                                name: "خوانده‌شده"
                            });
                            readShelf
                                .save();
                            const toBeReadShelf = new Shelf({
                                _id: new mongoose.Types.ObjectId(),
                                user: user._id,
                                name: "بعدا می‌خوانم"
                            });
                            toBeReadShelf
                                .save();

                            user.shelves = [toBeReadShelf, readingShelf, readShelf, likedShelf];

                            user
                                .save()
                                .then(result => {
                                    // console.log(result);
                                    const token = jwt.sign(
                                        {
                                            email: user.email,
                                            userId: user._id
                                        },
                                        "secret", {},
                                    );
                                    res.status(201).json({
                                        message: 'user created',
                                        token: token
                                    });
                                })
                                .catch(err => {
                                    // console.log(err);
                                    res.status(500).json({
                                        error: err
                                    })
                                });
                        }
                    });
            }
        })
});

router.post('/login', (req, res, next) => {
    User
        .findOne({email: req.body.email})
        .exec()
        .then(user => {
            if (user == null) {
                return res.status(401).json({
                    error: "user not found"
                });
            }
            bcrypt.compare(req.body.password, user.password, (err, result) => {
                if (err) {
                    return res.status(401).json({
                        error: "auth failed"
                    });
                }
                if (result) {
                    const token = jwt.sign(
                        {
                            email: user.email,
                            userId: user._id
                        },
                        "secret", {},
                    );
                    return res.status(200).json({
                        token: token,
                        user: {
                            name: user.name,
                            familyName: user.familyName,
                            profileImage: user.profileImage,
                            _id: user._id,
                            email: user.email
                        }
                    });
                }
                res.status(401).json({error: "auth failed"});
            });
        })
        .catch(err => {
            // console.log(err);
            res.status(500).json({error: err});
        });
});

module.exports = router;