const mongoose = require('mongoose');

const currentLocationSchema = mongoose.Schema({
    longitude: {type: Number } ,
    latitude: {type: Number }
});

const UserSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone_number: {
        type: Number,
        required: true
    },
    license_number: {
        type: String,
        required: true
    },
    car_number: {
        type: String,
        required: true
    },
    current_location: [currentLocationSchema]
});

module.exports = mongoose.model('user', UserSchema);