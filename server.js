const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
require("dotenv").config();

const port = process.env.PORT || 1338;
const app = express();

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(port, () => {
  console.log("Server is running on port " + port + "...");
});

const Promise = require("bluebird");
require("date-format-lite");

// get the client
const mysql = require("mysql2/promise");

async function serverСonfig() {
  const db = mysql.createPool({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
  });

  function getTask(data) {
    return {
      text: data.text,
      start_date: data.start_date.date("YYYY-MM-DD"),
      duration: data.duration,
      progress: data.progress || 0,
      parent: data.parent,
    };
  }

  function getLink(data) {
    return {
      source: data.source,
      target: data.target,
      type: data.type,
    };
  }

  function sendResponse(res, action, tid, error) {
    if (action == "error") console.log(error);

    const result = {
      action: action,
    };
    if (tid !== undefined && tid !== null) result.tid = tid;

    res.send(result);
  }
}

serverСonfig();
