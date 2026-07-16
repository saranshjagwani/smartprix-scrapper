import express from "express";
import dotenv from "dotenv";
import scraperRoutes from "./routes/scraper.routes.js";
import cors from "cors";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

app.use("/api/scraper", scraperRoutes);

const PORT =  3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});