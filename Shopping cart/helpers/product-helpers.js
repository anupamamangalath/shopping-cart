var db = require('../config/connection')
var collection = require('../config/collections')
var objectId = require('mongodb').ObjectID
module.exports = {
    addProduct: (product, callback) => {
        db.get().collection('product').insertOne(product).then((data) => {            //inserting data into db
            callback(data.ops[0]._id)
        })
    },
    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })

    },
    deleteProduct: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).removeOne({ _id: objectId(proId) }).then((response) => {
                resolve(response)
            })
        })
    },
    getProductDetails: (proId) => {
        return new Promise(async (resolve, reject) => {
            let product = db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(proId) }).then((product) => {
                resolve(product)
            })
           
        })
    },
    updateProduct:(proId,productdetails)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:objectId(proId)},{
                $set:{
                    name:productdetails.name,
                    category:productdetails.category,
                    description:productdetails.description,
                    price:productdetails.price

                }
            }).then((response)=>{
                resolve(response)
            })

        })
    },
    getAllMustHaves:()=>{
        return new Promise((resolve,reject)=>{
            let products=db.get().collection(collection.PRODUCT_COLLECTION).find({section:'must-have'}).toArray()
            resolve(products)
        })
    }
}
