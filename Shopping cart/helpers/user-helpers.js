var db = require('../config/connection')
var collection = require('../config/collections')
var bcrypt = require('bcrypt')
var objectId = require('mongodb').ObjectID
const { response } = require('express')
const productHelpers = require('./product-helpers')
const Razorpay=require('razorpay')
const { resolve } = require('path')
var instance = new Razorpay({
    key_id: 'rzp_test_t57HH3Wv7hqorW',
    key_secret: 'Hb5jWf1zW4UHnIs59vKmTS0D',
  });
module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.password = await bcrypt.hash(userData.password, 10)
            console.log(userData.password)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {                  //there is a promise for tis stmt
                resolve(data.ops[0])
            })
        })
    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginstatus = false
            let response = {
                status: false
            }
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email })
            //console.log(user)
            if (user) {
                response.mail = true
                bcrypt.compare(userData.password, user.password).then((status) => {
                    if (status) {
                        response.pass = true
                        console.log("success")
                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {
                        console.log("failed")
                        resolve(response)
                    }
                })
            } else {
                console.log("email failed")
                resolve(response)
            }
        })
    },
    addToCart: (proId, userId) => {
        let proObj = {
            item: objectId(proId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })         //userCart initiased with json type of doc with _id,user and products[]
            if (userCart) {                                                                                                       //check if usercart exist
                let proExist = userCart.products.findIndex(product => product.item == proId)                                     //initialise prroExist with index of product id found in item which is same as entered proId, here product is a iteration variable
                console.log(proExist)
                if (proExist != -1) {                                                                                           //check if proExist exist
                    db.get().collection(collection.CART_COLLECTION).updateOne({ 'user': objectId(userId), 'products.item': objectId(proId) },
                        {
                            $inc: { 'products.$.quantity': 1 }                                                                      //since array ele is changed $ is used 
                        }).then((response) => {
                            resolve()
                        })
                } else {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId) },
                        {
                            $push: { products: proObj }
                        }).then((response) => {
                            resolve()
                        })
                }
            } else {
                let cartObject = {
                    user: objectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObject).then((response) => {
                    resolve(response)
                })
            }
        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }      //from cart collection take the whole content matching userid
                },
                {
                    $unwind: '$products'             //the cart collection divides into objects of each different products
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
                        as: 'productdetails'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1,
                        productdetail: { $arrayElemAt: ["$productdetails", 0] }
                    }
                }
                /*  {
                     $lookup:{                           //join two collection here cart and products as cartItems 
                         from:collection.PRODUCT_COLLECTION,
                         let:{prolist:'$products'},                      //from cart collection product ids
                         pipeline:[                                      //does some fn between two data
                             {
                                 $match:{
                                     $expr:{                                         //checks if _id in prolist
                                         $in:['$_id',"$$prolist"]                //_id from product collection and prolist from cart collection
                                     }
                                 }
                             }
                         ],
                         as:'cartItems'
                     }
                 } */
            ]).toArray()
           // console.log(cartItems)
            //console.log(cartItems[0].productdetails)
            resolve(cartItems)
        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (cart) {
                count = cart.products.length
            } resolve(count)
        })
    },
    changeProductQuantity: (details) => {
        console.log(details)
        details.count = parseInt(details.count)
        return new Promise((resolve, reject) => {
            if (details.quantity == 1 && details.count == -1) {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cart) },
                    {
                        $pull: { products: { item: objectId(details.product) } }
                    }).then((response) => {
                        resolve({ removeProduct: true })
                    })
            } else {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cart), 'products.item': objectId(details.product) },
                    {
                        $inc: { 'products.$.quantity': details.count }                                                                      //since array ele is changed $ is used 
                    }
                ).then((response) => {
                    resolve({status:true})
                })
            }

        })
    },
    removeProduct: (details) => {
        //console.log(details)
        return new Promise(async(resolve, reject) => {
            await db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cart) },
                {
                    $pull: { products: { item: objectId(details.product) } }
                }
                ).then((response) => {
                    resolve({status:true})
                })

        })
    },
    getTotalAmount:(userId)=>{
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }      //from cart collection take the whole content matching userid
                },
                {
                    $unwind: '$products'             //the cart collection divides into objects of each different products
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
                        as: 'productdetails'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1,
                        productdetail:{ $arrayElemAt: ["$productdetails", 0] }
                    }
                }, 
                {
                $addFields: {
                    convertedPrice: { $toInt: "$productdetail.price" },
                 }
                },
                {
                    $group:{
                        _id:null,
                        total:{$sum:{$multiply:['$quantity','$convertedPrice']}}
                    }
                } 
                
            ]).toArray()
           // console.log(total[0].total)
            //console.log(cartItems[0].productdetails)
           // console.log("Total" +total)
            //console.log(total[0].total)
            resolve(total[0].total)
        })
    },
    placeOrder:(order,products,total)=>{
        return new Promise((resolve,reject)=>{
            console.log("in place order in user helper",order,products,total)
            let status=order['payment-method']==='COD'?'placed':'pending'          //since payment-methos is a string key unlike others
            let date = new Date()
            let orderObj={
                deliveryDetails:{
                    mobile:order.mobile,
                    address:order.addresss,
                    pincode:order.pincode
                },
                userId:objectId(order.userId),
                paymentMethod:order['payment-method'],
                products:products,
                total:total,
                status:status,
                date:date.getFullYear()+'/' + (date.getMonth()+1) + '/'+date.getDate()+'  '+date.getHours()+':'+date.getMinutes()
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                db.get().collection(collection.CART_COLLECTION).removeOne({user:objectId(order.userId)})
                /* console.log("orderObj",orderObj)
                console.log("response",response)
                console.log("response.ops[0]._id",response.ops[0]._id) */
                resolve(response.ops[0]._id)
            })
            
        })


    },
    getCartProductList:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            //console.log(cart)
            resolve(cart.products)

        })
    },
    getOrderDetails:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let orderDetails=await db.get().collection(collection.ORDER_COLLECTION).find({userId:objectId(userId)}).toArray()
            resolve(orderDetails)
        })
    } ,
    getOrderProducts:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
            let orderProduct=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{_id:objectId(orderId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{item:'$products.item',
                            quantity:'$products.quantity'}
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as: 'products'
                    }
                },
                {
                    $project:{ item: 1, quantity: 1,
                        productdetails:{ $arrayElemAt: ["$products", 0] }}
                }
            
            ]).toArray()
            console.log("orderProducts",orderProduct)
            resolve(orderProduct)
        })
    },
    generateRazorpay:(orderId,total)=>{
        //console.log(orderId)
        return new Promise((resolve,reject)=>{
            var options = {
                amount: total*100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: ""+orderId            //an objectId with a string gets auto converted to string
              };
              instance.orders.create(options, function(err, order) {
                  if(err){
                      console.log(err)
                  }else{
                console.log("New Order ",order);
                resolve(order)
                  }
              });
            
        })
    } ,
    verifyPayment: (details)=>{
        return new Promise((resolve,reject)=>{
            const crypto = require('crypto')
            let hmac = crypto.createHmac('sha256', 'Hb5jWf1zW4UHnIs59vKmTS0D')

            hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]'])
            hmac=hmac.digest('hex')
            if(hmac==details['payment[razorpay_signature]']){
                resolve()
            }else{
                reject()
            }

        })
    },
    changePaymentStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId)},
            {
                $set:{
                    status:'placed'
                }
            }
            ).then(()=>{
            resolve()
        })
        })

    } 


}

