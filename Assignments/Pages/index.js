import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = process.env.PORT || 3000;
const pagesDirectory = path.dirname(fileURLToPath(import.meta.url));

app.get("/", (req, res) => {
    fs.readFile(path.join(pagesDirectory, "home.html"), "utf8", (err, data) => {
        if (err) {
            res.status(500).send("Error reading file");
            return;
        } else {
            res.send(data);
        }
    });
});
app.get("/about", (req, res) => {
    fs.readFile(path.join(pagesDirectory, "aboutme.html"), "utf8", (err, data) => {
        if (err) {
            res.status(500).send("Error reading file");
            return;
        } else {
            res.send(data);
        }
    });
});
app.listen(port, () => {
    console.log(`Server is running on port http://localhost:${port}`);
});