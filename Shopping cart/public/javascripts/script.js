function addToCart(proId,name,user){
    console.log(user)
    if(user){
    $.ajax({
        url:'/add-to-cart/'+proId,
        method:'get',
        success:(response)=>{
            if(response.status){
                let count=$('#cart-count').html()
                count=parseInt(count)+1
                $("#cart-count").html(count)
            }
            alert(name+" added to cart")
        }
    })
}
else{
    alert("Please Login"+user)
}
}
