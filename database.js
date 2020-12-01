// // When a new tab is created, then check if it has a parentId.
// //If yes, then check db for the parentId and then add the current tab in the children tab of the parentId.
//
// async function main()
// {
// const {MongoClient} = require('mongodb');
//
// const uri = "mongodb+srv://sparrsh:rYbk0Zsh3jh4m7ES@tabdata.ttdvm.mongodb.net/test";
//
// const client= new MongoClient(uri,{ useNewUrlParser: true, useUnifiedTopology: true });
//
// try {
//         // Connect to the MongoDB cluster
//         await client.connect();
//
//         // Make the appropriate DB calls
//         await  listDatabases(client);
//
//         await insert(client);
//
//     } catch (e) {
//         console.error(e);
//     } finally {
//         await client.close();
//     }
//   }
//
// main().catch(console.error);
//
// async function listDatabases(client){
//     databasesList = await client.db().admin().listDatabases();
//
//     console.log("Databases:");
//     databasesList.databases.forEach(db => console.log(` - ${db.name}`));
// };
//
// async function insert(client){
//
//   db = await client.db("TabData");
//   console.log("hello world");
//   await db.collection("tab_data_test").insertOne(
//     {
//       x: "pencil", y: 50, z: "no.2"
//     }
//   )
// }
