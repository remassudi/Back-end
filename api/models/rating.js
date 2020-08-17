const mongoose = require('mongoose');

const ratingSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rate: { type: Number, required: true },
    date: { type: String, required: true }
});

module.exports = mongoose.model('Rating', ratingSchema);