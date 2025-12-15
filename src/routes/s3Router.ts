import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { S3Controller } from "../controllers/s3Controller";
import { authMiddleware } from "../middlewares/authMiddleware";
import { generateSignedUrl } from "../config/s3Client";

import { s3Client } from "../config/s3Client";
import { uploadAppFiles } from "../middlewares/multerConfig";

const s3Router = express.Router();
const upload = multer();
const s3Controller = new S3Controller();

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '../../uploads/profile-images');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

s3Router.get("/get-image-profile", authMiddleware, async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized: user not found" });
      return;
    }

    const userId = req.user.userId as string;
    const userDir = path.join(UPLOADS_DIR, userId);

    // Check if user directory exists and has files
    if (fs.existsSync(userDir)) {
      const files = fs.readdirSync(userDir);
      if (files.length > 0) {
        const fileName = files[0];
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const fileUrl = `${baseUrl}/uploads/profile-images/${userId}/${fileName}`;
        res.status(200).json({ message: "Profile image URL retrieved successfully", fileUrl });
        return;
      }
    }

    res.status(404).json({ message: "Profile image not found for this user", fileUrl: null });
  } catch (error: any) {
    console.error("Error retrieving profile image URL:", error);
    res.status(500).json({ message: error.message || "Failed to retrieve profile image URL" });
  }
});

s3Router.get("/get-app-files/:appId", async (req, res): Promise<void> => {
  try {
    const { appId } = req.params;

    if (!appId) {
      res.status(400).json({ message: "Valid appId is required in the URL parameters." });
      return;
    }

    const result = await s3Controller.getAppFilesByAppId(appId);
    res.status(200).json(result);

  } catch (error: any) {
    console.error(`Error retrieving application files for appId ${req.params.appId}:`, error);
    if (error.message === "App files not found for this application ID.") {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: error.message || "Failed to retrieve application files." });
    }
  }
});


s3Router.post("/upload-image-profile", authMiddleware, upload.single("file"), async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized: user not found" });
      return;
    }

    const userId = req.user.userId as string;
    const file = req.file;
    if (!file) {
      res.status(400).json({ message: "File is required" });
      return;
    }

    // Create user directory
    const userDir = path.join(UPLOADS_DIR, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    } else {
      // Delete existing profile images
      const existingFiles = fs.readdirSync(userDir);
      for (const existingFile of existingFiles) {
        fs.unlinkSync(path.join(userDir, existingFile));
        console.log(`🗑️ Deleted old profile image: ${existingFile}`);
      }
    }

    // Save new file
    const ext = path.extname(file.originalname) || '.jpg';
    const fileName = `profile${ext}`;
    const filePath = path.join(userDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    // Generate URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/profile-images/${userId}/${fileName}`;

    console.log(`✅ Profile image saved: ${filePath}`);
    res.status(201).json({ message: "Image uploaded successfully", fileUrl });
  } catch (error: any) {
    console.error("Error uploading image:", error);
    res.status(500).json({ message: error.message || "Image upload failed" });
  }
});

s3Router.post("/upload-app-files", authMiddleware, uploadAppFiles, async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized: user not found" });
      return;
    }

    const appId = req.body.appId;
    const userId = req.user.userId as string;

    const files = req.files as {
      icon?: Express.Multer.File[],
      appFile?: Express.Multer.File[],
      screenshots?: Express.Multer.File[]
    };

    let screenshotsToKeepUrls: string[] = [];
    if (req.body.screenshotsToKeep) {
      try {
        screenshotsToKeepUrls = JSON.parse(req.body.screenshotsToKeep);
        if (!Array.isArray(screenshotsToKeepUrls)) {
          throw new Error("screenshotsToKeep must be a JSON array of strings.");
        }
      } catch (parseError) {
        console.error("Error parsing screenshotsToKeep:", parseError);
        res.status(400).json({ message: "Invalid screenshotsToKeep format. Must be a JSON array of strings." });
        return;
      }
    }

    if (!appId) {
      res.status(400).json({ message: "Valid appId is required in the request body." });
      return;
    }

    const hasNewFiles = (files.icon && files.icon.length > 0) ||
      (files.appFile && files.appFile.length > 0) ||
      (files.screenshots && files.screenshots.length > 0);

    if (!hasNewFiles && screenshotsToKeepUrls.length === 0) {
      res.status(400).json({ message: "At least one new file (icon, appFile, or screenshots) or existing screenshot URLs (screenshotsToKeep) must be provided for upload/update." });
      return;
    }

    const result = await s3Controller.uploadAppFiles(files, appId, userId, screenshotsToKeepUrls);
    res.status(201).json(result);

  } catch (error: any) {
    console.error("Error uploading application files:", error);
    res.status(500).json({ message: error.message || "Failed to upload application files." });
  }
});

s3Router.delete("/delete-app-files/:appId", authMiddleware, async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized: user not found" });
      return;
    }
    const userId = req.user.userId as string;

    const { appId } = req.params;

    if (!appId) {
      res.status(400).json({ message: "Valid appId is required in the URL parameters." });
      return;
    }

    const result = await s3Controller.deleteAppFiles(appId, userId);
    res.status(200).json(result);

  } catch (error: any) {
    console.error(`Error deleting application files for appId ${req.params.appId}:`, error);
    if (error.message === "Unauthorized: You do not have permission to delete files for this app.") {
      res.status(403).json({ message: error.message });
    } else if (error.message === "App not found.") {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: error.message || "Failed to delete application files." });
    }
  }
});

s3Router.get("/files", authMiddleware, async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized: user not found" });
      return;
    }
    const userId = req.user.userId as string;
    const files = await s3Controller.listUserFiles(userId);
    res.json({ files });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener archivos" });
  }
});

export default s3Router;
