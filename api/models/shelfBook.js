const mongoose = require('mongoose');
const Book = require("./book");
const Shelf = require("./shelf");

const shelfBookSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    added_at: { type: Number, required: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    shelf: { type: mongoose.Schema.Types.ObjectId, ref: 'Shelf', required: true }
});

module.exports = mongoose.model('ShelfBook', shelfBookSchema);