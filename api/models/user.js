const mongoose = require('mongoose');
const Rating = require("./rating");
const Review = require("./review");
const Shelf = require("./shelf");
const TimelineFeed = require("./timelineFeed");

const userSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true,
        match: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/ 
    },
    password: { type: String, required: true },
    
    name: { type: String, default: ' ' },
    familyName: { type: String , default: ' '},
    birthDate: {type: String, default: null },
    birthMonth: {type: String, default: null },
    birthYear: {type: String, default: null },
    biography: { type: String, maxlength: 300, default: null },
    profileImage: { type: String, default: null },

    ratings: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Rating' }], default: [] },
    reviews: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }], default: [] },
    shelves: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Shelf' }], default: [] },

    followers: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
    followings: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
    timeline: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TimelineFeed' }], default: [] }
});

module.exports = mongoose.model('User', userSchema);