var db = require('../config/connection')
var collection = require('../config/collections')
var bcrypt = require('bcrypt')
var objectId = require('mongodb').ObjectID
const { response } = require('express')
const productHelpers = require('./product-helpers')


module.exports = {
    doAdminLogin: (adminData) => {
        return new Promise(async (resolve, reject) => {
            let loginstatus = false
            let response = {
                status: false
            }
            console.log(adminData)
            let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ email: adminData.email })
            //console.log(user)
            if (admin) {
                response.mail = true
                bcrypt.compare(adminData.password, admin.password).then((status) => {
                    if (status) {
                        response.pass = true
                        console.log("success")
                        response.admin = admin
                        response.status = true
                        resolve(response)
                    } else {
                        console.log("failed")
                        response.pass=false
                        console.log(response)
                        resolve(response)
                    }
                })
            } else {
                console.log("email failed")
                resolve(response)
            }
        })
    },
    doAdminSignup: (adminData) => {
        return new Promise(async (resolve, reject) => {
            adminData.password = await bcrypt.hash(adminData.password, 10)
            console.log(adminData.password)
            db.get().collection(collection.ADMIN_COLLECTION).insertOne(adminData).then((data) => {                  //there is a promise for tis stmt
                resolve(data.ops[0])
            })
        })
    },
    displayUsers: () => {
        return new Promise(async (resolve, reject) => {
            let users = await db.get().collection(collection.USER_COLLECTION).find().toArray()
            //console.log(users)
            resolve(users)
        })
    },
    userOrderDetails: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orderDetails = await db.get().collection(collection.ORDER_COLLECTION).find({ userId: objectId(userId) }).toArray()
            //console.log(orderDetails)
            resolve(orderDetails)
        })
    },
    displayOneUser: (userId) => {
        return new Promise(async (resolve, reject) => {
            let Oneuser = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(userId) })
            console.log(Oneuser)
            resolve(Oneuser)
        })
    },
    displayProductDetails: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orderdetails=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{userId:objectId(userId)}
                },{
                    $unwind:'$products'
                },{
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity',
                        deliveryDetails:1,
                        total:1,
                        status:1,
                        paymentMethod:1,
                        date:1
                    }

                },{
                    $lookup:{
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'productsdetails'

                    }
                },
                  {
                    $unwind:'$productsdetails'
                }, {
                    $group:{
                        _id:'$_id',
                        productdetails: { $push:  { product: "$productsdetails", quantity: "$quantity" } },
                        deliverydetails:{$push:{delivery:'$deliveryDetails'}},
                        otherdetails:{$push:{total:'$total',status:'$status',paymentMethod:'$paymentMethod',date:'$date'}}
                    } } 
                
            ]).toArray()
          /*   console.log(orderdetails)
            console.log(orderdetails[0])
            console.log(orderdetails[0].productdetails)
            console.log(orderdetails[0].deliverydetails[0].delivery.mobile)
            console.log(orderdetails[0].otherdetails) */
            resolve(orderdetails)
           /* /*  let orderProduct = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'products'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1,
                        productdetails: { $arrayElemAt: ["$products", 0] }
                    }
                }

            ]).toArray()
           // console.log("orderProducts", orderProduct) */
            
        })
    }
}