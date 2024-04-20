const express = require("express");
const router = express.Router();
const fs = require("fs");
const bcrypt = require("bcryptjs");
const session = require("express-session");

// Middleware to read books data from file
const readBooksFromFile = () => {
    try {
        const data = fs.readFileSync("books.txt", "utf8");
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

// Set up session middleware
router.use(
    session({
        secret: "random string",
        resave: true,
        saveUninitialized: true,
    })
);

// Load user data
const users = require("./passwd.json");

// Render login form
router.get("/login", (req, res) => {
    res.render("login", { info: "PLEASE LOGIN" });
});

// Handle login form submission
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

// Logout route
router.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/books/");
});

// Route middleware to check authentication
router.use((req, res, next) => {
    if (!req.session.username) {
        res.redirect("/books/login");
    } else {
        next();
    }
});

// Render home page with books data
router.get("/", (req, res) => {
    req.session.count++;
    const filename = req.session.username + ".txt";
    const books = readBooksFromFile(filename);
    const info = `User: ${req.session.username} Count: ${
        req.session.count
    } ${new Date()}`;
    res.render("books", { info, books });
});

// Handle form submission for adding or deleting a book
router.post("/", (req, res) => {
    const { action, ...bookData } = req.body; // Extract action and book data from request
    let books = readBooksFromFile();

    if (action === "add") {
        books.push(bookData); // Add new book to array
    } else if (action === "delete") {
        const bookIndex = books.findIndex(
            (book) => book.title === bookData.bookName
        ); // Find index of book to delete
        if (bookIndex !== -1) {
            books.splice(bookIndex, 1); // Remove book from array
        }
    }

    // Write updated book data to file
    fs.writeFile("books.txt", JSON.stringify(books), (err) => {
        if (err) throw err;
        console.log("Book data has been saved!");
        res.redirect("/books/");
    });
});

module.exports = router;
