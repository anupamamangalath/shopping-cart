const mongoClient=require('mongodb').MongoClient
const state={
    db:null
}
module.exports.connect=function(done){
    const url='mongodb://localhost:27017'                                                               //done is  a parameter callback fn
    const dbname='shopping'
    
    mongoClient.connect(url,(err,data)=>{
        if(err) return done(err)
        state.db=data.db(dbname)
        //console.log(data)
        done()
    })
    
}
module.exports.get=function(){
    return state.db
}