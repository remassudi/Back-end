const mongoose = require('mongoose');
const ShelfBook = require("./shelfBook");

const shelfSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    books: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ShelfBook' }], default: [] },
});

module.exports = mongoose.model('Shelf', shelfSchema);