const mongoose = require('mongoose');
const Review = require("./review");

const bookSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    ISBN: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    writer: { type: String, required: true },
    language: { type: String, required: true },
    publisher: { type: String, required: true },
    page: { type: Number, required: true },

    translator: { type: String, default: null },
    realName: { type: String, default: null },
    summary: { type: String, default: null },
    bookImage: { type: String, default: null },

    totalRating: { type: Number, default: 0 },
    numberRating: { type: Number, default: 0 },
    computedRating: { type: Number, default: 0 },

    reviews: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }], default: [] },
});

module.exports = mongoose.model('Book', bookSchema);