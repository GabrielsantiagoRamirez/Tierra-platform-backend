const { Schema } = require("mongoose");

const budgetItemSchema = new Schema({
    // _id se genera automáticamente por MongoDB
    concept:{
        type: String,
        required: true
    },
    quantity:{
        type: Number,
        required: true
    },
    unit:{
        type: String,
        required:true
    },
    unitPrice:{
        type:Number,
        required:true
    },
    notes:{
        type:String,
        default:null
    }
});


module.exports = budgetItemSchema;
