

require('dotenv').config();
const express = require('express');
const app = express();
const { MongoClient } = require('mongodb');

//const url = process.env.const_url;
const atlasurl = process.env.mongo_url;
const client = new MongoClient(atlasurl);

let db;

const connectToDb = async () => {
  try {
    await client.connect();   
    db = client.db("bookstore");
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error(err);
  }
}

module.exports = { connectToDb, getDb: () => db };