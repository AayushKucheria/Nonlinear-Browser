async function main()
{
const {MongoClient} = require('mongodb');

const uri = "mongodb+srv://sparrsh:rYbk0Zsh3jh4m7ES@tabdata.ttdvm.mongodb.net/test";

const client= new MongoClient(uri,{ useNewUrlParser: true, useUnifiedTopology: true });

try {
       // Connect to the MongoDB cluster
       await client.connect();

       // Make the appropriate DB calls
       await  listDatabases(client);

   } catch (e) {
       console.error(e);
   } finally {
       await client.close();
   }
}
console.log("successful");
main().catch(console.error);

async function listDatabases(client){
    databasesList = await client.db().admin().listDatabases();

    console.log("Databases:");
    databasesList.databases.forEach(db => console.log(` - ${db.name}`));
};
