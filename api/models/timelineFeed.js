const mongoose = require('mongoose');

const timelineFeedSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String },
    r_id: { type: mongoose.Schema.Types.ObjectId }
});

module.exports = mongoose.model('TimelineFeed', timelineFeedSchema);