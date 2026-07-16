import express from "express";
import {
  processMonthlySpecs,
} from "../services/processPhone.js";

const router = express.Router();

router.post("/monthly-sync", async (req, res) => {
  try {
    console.log("Starting Monthly Specs Sync...");

    await processMonthlySpecs();

    return res.status(200).json({
      success: true,
      message: "Monthly specs sync completed",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Monthly specs sync failed",
      error: error.message,
    });
  }
});

export default router;