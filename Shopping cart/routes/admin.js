var express = require('express');
var router = express.Router();
var productHelper = require('../helpers/product-helpers')
var adminHelper=require('../helpers/admin-helpers')
var userHelper=require('../helpers/user-helpers')

var Handlebars = require('handlebars');
const productHelpers = require('../helpers/product-helpers');
const { route } = require('./user');
Handlebars.registerHelper("inc", function (value, options) {
  return parseInt(value) + 1;
});

const verifyLogin = (req, res, next) => {
  if (req.session.adminLoggedIn) {
    next()
  }
  else {
    res.redirect('/admin/adminlogin/')

  }
}

/* GET users listing. */
router.get('/', function (req, res, next) {
  let admin=req.session.admin
  if(admin){
  productHelper.getAllProducts().then((products) => {
  
    res.render('admin/view-product', { products, admin:req.session.admin })
  })}else{
    res.render('admin/login',{admin:req.session.admin})
  }
});


router.get('/signup',(req,res)=>{
  res.render('superadmin/admin-signup')
})
router.post('/signup',(req,res)=>{
  adminHelper.doAdminSignup(req.body).then((response)=>{
    //console.log(response);
    req.session.admin=response
    req.session.adminLoggedIn=true
    res.redirect('/admin') 
  })
})

router.get('/adminlogin', (req, res) => {
  if (req.session.admin) {
    res.redirect('/admin')
  } else {
    res.render('admin/login', { "loginErrpass": req.session.adminloginErrpass, "loginErrmail": req.session.adminloginErrmail })
    req.session.userloginErr = false
  }
})
router.post('/adminlogin', (req, res) => {
  adminHelper.doAdminLogin(req.body).then((response) => {
    if (response.status) {
      req.session.admin = response.admin
      req.session.adminLoggedIn = true
      //console.log("response.user"+response.user)
      res.redirect('/admin')
    } else {
      if (!response.mail) {
        req.session.adminloginErrmail = "Invalid email id"
      }
      if (!response.pass) {
        req.session.adminloginErrpass = "Invalid password"
      }
      res.redirect('/admin/adminlogin/')
    }
  })
})

router.get('/adminlogout',(req,res)=>{
  req.session.admin=null
  req.session.adminLoggedIn=false
  res.redirect('/admin/')
})


router.get('/add-product',verifyLogin, function (req, res, next) {
  res.render('admin/add-product',{admin:req.session.admin})

});
router.post('/add-product', (req, res) => {
  
  //console.log("in admin.js priniting req.files.image "+ req.files.imagename);
  productHelper.addProduct(req.body, (id) => {
    let image = req.files.imagename
    //console.log(req.body)
    image.mv('./public/product-images/' + id + '.jpg', (err) => {
      if (!err) {
        res.render('admin/add-product',{admin:req.session.admin})
      } else {
        console.log("error in admin.js")
      }
    })
    res.render("admin/add-product",{admin:req.session.admin})
  })

})
router.get('/delete-product/:id',verifyLogin, (req, res) => {
  let proId = req.params.id                                         //let proId=req.query.id  no id requires in url
  productHelper.deleteProduct(proId).then((response) => {
    res.redirect('/admin/')
  })
})
router.get('/edit-product/:id',verifyLogin, async (req, res) => {
  let product = await productHelpers.getProductDetails(req.params.id)
  //console.log(product)
  res.render('admin/edit-product', { product,admin:req.session.admin })

})
router.post('/edit-product/:id', (req, res) => {
  productHelper.updateProduct(req.params.id, req.body).then(() => {
    res.redirect('/admin/')
    if (req.files.imagename) {
      let image = req.files.imagename
      image.mv('./public/product-images/' + req.params.
        id + '.jpg')
    }
  })
})
router.get('/display-users',verifyLogin,async(req,res)=>{
  let users=await adminHelper.displayUsers()
  res.render('admin/display-users',{users,admin:req.session.admin})
})
router.get('/view-user-order/:id',verifyLogin,async(req,res)=>{
  let userdetails=await adminHelper.displayOneUser(req.params.id)
  let orderDetails= await adminHelper.displayProductDetails(req.params.id)
  //console.log(orderDetails[0].deliverydetails[0].delivery.address)
  //console.log(orderDetails)
 /*  let orders=await adminHelper.userOrderDetails(req.params.id)
  var i=0
  let products=[]
  while (i<orders.length){
   products.push(await adminHelper.displayProductDetails(orders[i]._id))
   i=i+1;
  }
   /* console.log("User:",user)
  console.log('Orders:',orders)*/
  
  
  res.render('admin/view-user-order',{admin:req.session.admin,userdetails,orderDetails})
})

module.exports = router;