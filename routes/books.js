const express = require("express");
const router = express.Router();
const fs = require("fs");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const sqlite3 = require("sqlite3");
const fileUpload = require("express-fileupload");

const db = new sqlite3.Database("books.sqlitedb");

db.serialize();

db.run(`CREATE TABLE IF NOT EXISTS books(
    "id" INTEGER PRIMARY KEY,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "start" TEXT,
    "end" TEXT,
    "description" TEXT,
    "rating" TEXT,
    "img" TEXT
)`);

db.parallelize();

router.use(fileUpload());

router.use(
    session({
        secret: "random string",
        resave: true,
        saveUninitialized: true,
    })
);

const users = require("./passwd.json");

router.get("/login", (req, res) => {
    res.render("login", { info: "Please log in to get access to your books" });
});

router.post("/login", (req, res) => {
    bcrypt.compare(
        req.body.password,
        users[req.body.username] || "",
        (err, is_match) => {
            if (err) throw err;
            if (is_match === true) {
                req.session.username = req.body.username;
                req.session.count = 0;
                res.redirect("/books/");
            } else {
                res.render("login", { warn: "TRY AGAIN" });
            }
        }
    );
});

router.post("/logout", (req, res) => {
    console.log("Logout route accessed");
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
        } else {
            res.redirect("/books/login");
        }
    });
});

router.all("*", function (req, res, next) {
    if (!req.session.username) {
        res.redirect("/books/login");
        return;
    }
    next();
});

router.get("/", function (req, res, next) {
    req.session.count++;
    const s =
        "User: " +
        req.session.username +
        " Count: " +
        req.session.count +
        " " +
        new Date();
    db.all("SELECT * FROM books ", function (err, rows) {
        if (err) throw err;
        res.render("books", { info: s, rows: rows });
    });
});

router.post("/upload", (req, res) => {
    if (
        !req.body.title ||
        !req.body.author ||
        !req.body.start ||
        !req.body.end ||
        !req.body.description ||
        !req.body.rating
    ) {
        // Redirect back to the form with an error message
        res.redirect("/books/?error=Please fill in all fields");
        return;
    }

    let img = "";
    if (req.files && req.files.img) {
        img = "/images/" + req.files.img.name;
        req.files.img.mv("./public" + img, (err) => {
            if (err) throw err;
            insertBook(req, res, img);
        });
    } else {
        insertBook(req, res, img);
    }
});

function insertBook(req, res, img) {
    db.run(
        `INSERT INTO books("title", "author", "start", "end", "description", "rating", "img")
        VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
            req.body.title,
            req.body.author,
            req.body.start,
            req.body.end,
            req.body.description,
            req.body.rating,
            img,
        ],
        (err) => {
            if (err) throw err;
            res.redirect("/books/");
        }
    );
}

router.post("/delete", (req, res) => {
    db.run("DELETE FROM books WHERE id = ?", req.body.id, (err) => {
        if (err) throw err;
        res.redirect("/books/");
    });
});

module.exports = router;
