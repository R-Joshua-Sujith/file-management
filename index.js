const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const adminRoutes = require("./routes/admin")
const directoryRoutes = require("./routes/directory");
const userRoutes = require("./routes/user")

dotenv.config();
const app = express();

app.use(cors());
app.use('/uploads', express.static('uploads'));

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("DB Connection Successful"))
    .catch((err) => console.log(err))

app.use("/api/admin", adminRoutes)
app.use("/api/directory", directoryRoutes)
app.use("/api/user", userRoutes);

app.listen(5000, () => {
    console.log(`Server is running`);
});


