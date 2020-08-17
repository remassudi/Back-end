const mongoose = require('mongoose');

const reviewSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    review: { type: String, required: true },
    title: { type: String, required: true },
    date: { type: String, required: true }
});

module.exports = mongoose.model('Review', reviewSchema);