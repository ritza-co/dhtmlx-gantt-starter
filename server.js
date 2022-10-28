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
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database,
  });

  app.get("/data", (req, res) => {
    Promise.all([
      db.query("SELECT * FROM gantt_tasks ORDER BY sortorder ASC"),
      db.query("SELECT * FROM gantt_links"),
    ])
      .then((results) => {
        const tasks = results[0][0],
          links = results[1][0];

        for (let i = 0; i < tasks.length; i++) {
          tasks[i].start_date = tasks[i].start_date.format(
            "YYYY-MM-DD hh:mm:ss"
          );
          tasks[i].open = true;
        }

        res.send({
          data: tasks,
          collections: { links: links },
        });
      })
      .catch((error) => {
        sendResponse(res, "error", null, error);
      });
  });

  // add a new task
  app.post("/data/task", (req, res) => {
    const task = getTask(req.body);
    // find task with highest sortorders
    db.query("SELECT MAX(sortorder) AS maxOrder FROM gantt_tasks")
      .then((result) => {
        // assign max sort order to new task
        const orderIndex = (result[0][0].maxOrder || 0) + 1;
        return db.query(
          "INSERT INTO gantt_tasks(text, start_date, duration," +
            "progress, parent, sortorder) VALUES (?,?,?,?,?,?)",
          [
            task.text,
            task.start_date,
            task.duration,
            task.progress,
            task.parent,
            orderIndex,
          ]
        );
      })
      .then((result) => {
        sendResponse(res, "inserted", result.insertId);
      })
      .catch((error) => {
        sendResponse(res, "error", null, error);
      });
  });

  // update a task
  app.put("/data/task/:id", (req, res) => {
    const sid = req.params.id,
      target = req.body.target,
      task = getTask(req.body);
    Promise.all([
      db.query(
        "UPDATE gantt_tasks SET text = ?, start_date = ?," +
          "duration = ?, progress = ?, parent = ? WHERE id = ?",
        [
          task.text,
          task.start_date,
          task.duration,
          task.progress,
          task.parent,
          sid,
        ]
      ),
      updateOrder(sid, target),
    ])
      .then((result) => {
        sendResponse(res, "updated");
      })
      .catch((error) => {
        sendResponse(res, "error", null, error);
      });
  });

  function updateOrder(taskId, target) {
    let nextTask = false;
    let targetOrder;

    target = target || "";

    if (target.startsWith("next:")) {
      target = target.substring("next:".length);
      nextTask = true;
    }

    return db
      .query("SELECT * FROM gantt_tasks WHERE id = ?", [target])
      .then((result) => {
        if (!result[0][0]) return Promise.resolve();
        targetOrder = result[0][0].sortorder;
        if (nextTask) targetOrder++;
        return db
          .query(
            "UPDATE gantt_tasks SET sortorder" +
              " = sortorder + 1 WHERE sortorder >= ?",
            [targetOrder]
          )
          .then((result) => {
            return db.query(
              "UPDATE gantt_tasks SET sortorder = ? WHERE id = ?",
              [targetOrder, taskId]
            );
          });
      });
  }

  // delete a task
  app.delete("/data/task/:id", (req, res) => {
    const sid = req.params.id;
    db.query("DELETE FROM gantt_tasks WHERE id = ?", [sid])
      .then((result) => {
        sendResponse(res, "deleted");
      })
      .catch((error) => {
        sendResponse(res, "error", null, error);
      });
  });

  // add a link
  app.post("/data/link", (req, res) => {
    const link = getLink(req.body);

    db.query("INSERT INTO gantt_links(source, target, type) VALUES (?,?,?)", [
      link.source,
      link.target,
      link.type,
    ])
      .then((result) => {
        sendResponse(res, "inserted", result.insertId);
      })
      .catch((error) => {
        sendResponse(res, "error", null, error);
      });
  });

  // update a link
  app.put("/data/link/:id", (req, res) => {
    const sid = req.params.id,
      link = getLink(req.body);

    db.query(
      "UPDATE gantt_links SET source = ?, target = ?, type = ? WHERE id = ?",
      [link.source, link.target, link.type, sid]
    )
      .then((result) => {
        sendResponse(res, "updated");
      })
      .catch((error) => {
        sendResponse(res, "error", null, error);
      });
  });

  // delete a link
  app.delete("/data/link/:id", (req, res) => {
    const sid = req.params.id;
    db.query("DELETE FROM gantt_links WHERE id = ?", [sid])
      .then((result) => {
        sendResponse(res, "deleted");
      })
      .catch((error) => {
        sendResponse(res, "error", null, error);
      });
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
    if (action === "error") console.log(error);

    const result = {
      action: action,
    };
    if (tid !== undefined && tid !== null) result.tid = tid;

    res.send(result);
  }
}

serverСonfig();
