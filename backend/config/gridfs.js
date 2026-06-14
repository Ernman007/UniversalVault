const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');

// Use memory storage and manually upload to GridFS
// This avoids the multer-gridfs-storage compatibility issues with Mongoose 8.x
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Manual GridFS upload function
const uploadToGridFS = (fileBuffer, originalname, mimetype) => {
  return new Promise((resolve, reject) => {
    if (mongoose.connection.readyState !== 1) {
      return reject(new Error('Database connection not ready'));
    }

    const db = mongoose.connection.db;
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });

    crypto.randomBytes(16, (err, buf) => {
      if (err) return reject(err);

      const filename = buf.toString('hex') + path.extname(originalname);
      const readableStream = new Readable();
      readableStream.push(fileBuffer);
      readableStream.push(null);

      const uploadStream = bucket.openUploadStream(filename, {
        contentType: mimetype,
        metadata: { originalName: originalname }
      });

      uploadStream.on('finish', () => {
        resolve({
          id: uploadStream.id,
          filename: filename,
          originalName: originalname,
          contentType: mimetype
        });
      });

      uploadStream.on('error', reject);
      readableStream.pipe(uploadStream);
    });
  });
};

// Function to get the GridFS bucket
let bucket;
const getBucket = () => {
  if (bucket) return bucket;
  if (!mongoose.connection.db) {
    throw new Error('Database not connected');
  }
  bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'uploads'
  });
  return bucket;
};

module.exports = {
  upload,
  getBucket,
  uploadToGridFS
};
