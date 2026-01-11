require("dotenv").config();
const express = require("express");
const mongoose = require("./config/db");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

const PORT = process.env.PORT || 5000;
app.get("/", (req, res) => {
    res.send("Nuvix Backend API is running");
  });

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/users", require("./routes/user"));
app.use("/loans", require("./routes/loan"));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

