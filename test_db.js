async function main()
{
const {MongoClient} = require('mongodb');

const uri = "mongodb+srv://sparrsh:rYbk0Zsh3jh4m7ES@tabdata.ttdvm.mongodb.net/test";
// var x=0;
//
// async function main()
// {
//
// const {MongoClient} = require('mongodb');
//
// const uri = "mongodb+srv://sparrsh:rYbk0Zsh3jh4m7ES@tabdata.ttdvm.mongodb.net/test";
//
// const client= new MongoClient(uri,{ useNewUrlParser: true, useUnifiedTopology: true });
//
// try {
//        // Connect to the MongoDB cluster
//        await client.connect();
//        console.log("connected");
//        x=1;
//
//        // Make the appropriate DB calls
//        await  listDatabases(client);
//
//    } catch (e) {
//        console.error(e);
//    } finally {
//        await client.close();
//    }
//  }
//  if(x ===1 )
//  {
// console.log("successful");
// }
// //main().catch(console.error);
//
// async function listDatabases(client){
//     databasesList = await client.db().admin().listDatabases();
//
//     console.log("Databases:");
//     databasesList.databases.forEach(db => console.log(` - ${db.name}`));
// };
//
// // const mongodb = require('mongodb');
// // const MongoClient = mongodb.MongoClient;
// //
// // var url= "mongodb+srv://sparrsh:rYbk0Zsh3jh4m7ES@tabdata.ttdvm.mongodb.net/test";
// //
// // const client= new MongoClient(url,{ useNewUrlParser: true, useUnifiedTopology: true });
// //
// // client.connect(url, function(err,db)
// // {
// //   if (err) throw err;
// //   console.log("Database created!");
// //   db.close();
// // })

const client= new MongoClient(uri,{ useNewUrlParser: true, useUnifiedTopology: true });
async function Connect()
{

try {
       // Connect to the MongoDB cluster
       await client.connect();
var MongoClient = require('mongodb').MongoClient;

       // Make the appropriate DB calls
       await  listDatabases(client);
MongoClient.connect("mongodb+srv://sparrsh:rYbk0Zsh3jh4m7ES@tabdata.ttdvm.mongodb.net/test",{useNewUrlParser:true, useUnifiedTopology:true}, function(err, client)
{
  if(!err){
    console.log("we are connected");
  }
  var db = client.db('TabData');
  var data=db.collection('tab_data_test');

   } catch (e) {
       console.error(e);
   } finally {
       await client.close();
   }
}
console.log("successful");
main().catch(console.error);
  const documents = [{
    name: 'Jack',
    age: 23
  }, {
    name: 'Kate',
    age: 29
  }];

async function listDatabases(client){
    databasesList = await client.db().admin().listDatabases();
  data.insertMany(documents);
  //client.close();

    console.log("Databases:");
    databasesList.databases.forEach(db => console.log(` - ${db.name}`));
})
};
