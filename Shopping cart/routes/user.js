const { response } = require('express');
const e = require('express');
var express = require('express');
var router = express.Router();
var productHelper = require('../helpers/product-helpers')
var userHelper = require('../helpers/user-helpers')
var Handlebars = require('handlebars');
const productHelpers = require('../helpers/product-helpers');
Handlebars.registerHelper("inc", function (value, options) {
  return parseInt(value) + 1;
});


const verifyLogin = (req, res, next) => {
  if (req.session.userLoggedIn) {
    next()
  }
  else {
    res.redirect('/login')

  }
}

/* GET home page. */
router.get('/', async function (req, res, next) {
  let user = req.session.user
  //console.log(user)
  let cartCount = null
  if (req.session.user) {
    cartCount = await userHelper.getCartCount(user._id)
  }
   productHelper.getAllMustHaves().then((products)=>{
     console.log(products)
    res.render('user/view-product',{products,user,cartCount})
  } )
  /*  productHelper.getAllProducts().then((products) => {
    //console.log(products)
    res.render('user/view-product', { products, user, cartCount }) 
  }) */
})

router.get('/login', (req, res) => {
  if (req.session.user) {
    res.redirect('/')
  } else {
    res.render('user/login', { "loginErrpass": req.session.userloginErrpass, "loginErrmail": req.session.userloginErrmail })
    req.session.userloginErr = false
  }
})
router.get('/signup', (req, res) => {
  res.render('user/signup')
})
router.post('/signup', (req, res) => {
  userHelper.doSignup(req.body).then((response) => {
    console.log(response);
    req.session.user = response
    req.session.userLoggedIn = true
    res.redirect('/')
  })
})
router.post('/login', (req, res) => {
  console.log(req.body)
  userHelper.doLogin(req.body).then((response) => {
     console.log(response)
    if (response.status) {
      req.session.user = response.user
      req.session.userLoggedIn = true
      // console.log(req.session)
      //console.log("response.user"+response.user)
      res.redirect('/')
    } else {
      if (!response.mail) {
        req.session.userloginErrmail = "Invalid email id"
      }
      if (!response.pass) {
        req.session.userloginErrpass = "Invalid password"
      }
      res.redirect('/login')
    }
  })
})
router.get('/logout', (req, res) => {
  req.session.user = null
  req.session.userLoggedIn = false
  res.redirect('/')
})



router.get('/cart', verifyLogin, async (req, res) => {
  let products = await userHelper.getCartProducts(req.session.user._id)
  if (products.length > 0) {
    let totalvalue = await userHelper.getTotalAmount(req.session.user._id)
    res.render('user/cart', { products, user: req.session.user, totalvalue })
  } else {
    let totalvalue = 0
    res.render('user/cart', { totalvalue, user: req.session.user })
  }
  //console.log(products)

})


router.get('/add-to-cart/:id',verifyLogin,(req, res) => {
  userHelper.addToCart(req.params.id, req.session.user._id).then(() => {
   res.json({ status: true })
  })

})

router.post('/change-product-quantity', (req, res, next) => {

  userHelper.changeProductQuantity(req.body).then(async (response) => {
    let products = await userHelper.getCartProducts(req.session.user._id)
    if (products.length > 0) {
        response.total = await userHelper.getTotalAmount(req.session.user._id)
      } else {
        response.total=0
      }
    res.json(response)


  })
})
router.post('/remove-product', (req, res, next) => {
  userHelper.removeProduct(req.body).then(async (response) => {
  let products = await userHelper.getCartProducts(req.session.user._id)
  if (products.length > 0) {
      response.total = await userHelper.getTotalAmount(req.session.user._id)
    } else {
      response.total=0
    }
    res.json(response)
  })
})
router.get('/place-order', verifyLogin, async (req, res) => {
  let total = await userHelper.getTotalAmount(req.session.user._id)
  res.render('user/place-order', { total, user: req.session.user })

})
router.post('/place-order', async (req, res) => {                      //req.body in post is the content that is filled in form
  //console.log("in routes req.body",req.body)
  let products = await userHelper.getCartProductList(req.body.userId)         //resolve(x) comes to then or z=fn() as z=x
  let totalPrice = await userHelper.getTotalAmount(req.body.userId)
  userHelper.placeOrder(req.body, products, totalPrice).then((orderId) => {
    if (req.body['payment-method']==='COD') {
      //console.log("cod")
      res.json({ codSuccess: true })
    }
    else {

      //console.log(orderId)
      userHelper.generateRazorpay(orderId, totalPrice).then((response) => {
        res.json(response)
      })
    }
  })
})
router.get('/order-success', (req, res) => {
  res.render('user/order-success', { user: req.session.user })
})

router.get('/view-orders', verifyLogin, async (req, res) => {
  console.log("reached")
  let orderDetails = await userHelper.getOrderDetails(req.session.user._id)
  //console.log(orderDetails)
  res.render('user/view-orders', { orderDetails, user: req.session.user })
})


router.get('/view-ordered-products/:id', async (req, res) => {
  let productDetails = await userHelper.getOrderProducts(req.params.id)
  //console.log(productDetails)
  res.render('user/view-ordered-products', { productDetails, user: req.session.user })
})
router.post('/verify-payment', async (req, res) => {
  console.log(req.body)
  await userHelper.verifyPayment(req.body).then(() => {
    console.log("payment succesfull")
    userHelper.changePaymentStatus(req.body['order[receipt]']).then(() => {
      res.json({ status: true })
    })

  }).catch((err) => {
    res.json({ status: false, errMsg: 'error message' })
  })
})
router.get('/list-product',async(req,res)=>{
  let user = req.session.user
  let cartCount = null
  if (req.session.user) {
    cartCount = await userHelper.getCartCount(user._id)
  }
   productHelper.getAllProducts().then((products)=>{
     console.log(products)
  res.render('user/list-product',{products,user,cartCount})
})
})
router.get('/quickView/:proid',async(req,res)=>{
 
  console.log("reahced")
  let product= await productHelper.getProductDetails(req.params.proid)
  console.log("pdt",product)
  res.render('user/quickView',{product,user:req.session.user})
})
router.get('/customer-care',(req,res)=>{
  res.render('user/customer-care',{user:req.session.user})
})
module.exports = router;
