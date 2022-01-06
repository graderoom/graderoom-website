//setup lowDB
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const adapter = new FileSync("user_db.json");
const db = low(adapter);

//setup mongodb
const {MongoClient} = require("mongodb");
mongoUrl = "mongodb://localhost:27017";

const DATABASE_NAME = "migrated";

const SCHOOL_NAMES = ["bellarmine", "basis"];
const USERS_COLLECTION_NAME = "users";
const CLASSES_COLLECTION_NAME = "classes";

const userCollection = (school) => {
    return school + "_" + USERS_COLLECTION_NAME;
};

const classesCollection = (school) => {
    return school + "_" + CLASSES_COLLECTION_NAME;
};

//migrate function
async function migrate(client) {
    console.log("Migrating . . .");

    //CREATE DATABASE
    let dbNames = await client.db().admin().listDatabases();
    dbNames = dbNames.databases.map(x => x.name);
    if (dbNames.includes(DATABASE_NAME)) {
        throw "Migration Failed. Database Already Exists: " + DATABASE_NAME;
    }
    const mongodb = await client.db(DATABASE_NAME);

    // TRANSFER USERS
    let users = db.get("users").value();

    for (let school of SCHOOL_NAMES) {
        await mongodb.createCollection(userCollection(school));
    }

    for (let user of users) {
        let school = user["school"];
        delete user["school"];
        if (!SCHOOL_NAMES.includes(school)) {
            throw "Migration Failed. Invalid School: " + school;
        }
        user["version"] = 0;
        await mongodb.collection(userCollection(school)).insertOne(user);
    }

    //TRANSFER CLASSES
    let classes = db.get("classes").value();

    for (let school of SCHOOL_NAMES) {
        await mongodb.createCollection(classesCollection(school));
    }

    for (let term in classes) {
        for (let semester in classes[term]) {
            for (let className in classes[term][semester]) {
                let classData = classes[term][semester][className];
                classData["teachers"] = [];
                for (let teacher in classData) {
                    if (!["teachers", "classType", "credits", "department", "description", "terms", "uc_csuClassType", "grade_levels"].includes(teacher)) {
                        classData[teacher]["teacher"] = teacher;
                        classData["teachers"].push(classData[teacher]);
                        delete classData[teacher];
                    }
                }
                classData["term"] = term;
                classData["semester"] = semester;
                classData["className"] = className;
                classData["version"] = 0;

                let school;
                if (semester === "_") {
                    school = "basis";
                } else {
                    school = "bellarmine";
                }
                await mongodb.collection(classesCollection(school)).insertOne(classData);
            }
        }
    }

}

//connection & migrate
MongoClient.connect(mongoUrl).then((client) => {
    migrate(client).then(() => {
        console.log("Finished!");
    }).catch((err) => {
        console.log(err);
    }).finally(async () => {
        await client.close();
    });
});

//TODO: fix incorrect datatypes
