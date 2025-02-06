  const express = require('express');
  const multer = require('multer');
  const path = require('path');
  const fs = require('fs');
  const cors = require('cors');
  const crypto = require('crypto');
  const { Pool } = require('pg');

  const app = express();
  app.use(cors({ origin: 'http://localhost:3000' }));
  app.use(express.json());
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // PostgreSQL Database Connection
  const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'identity_verification',
    password: 'eashu777',
    port: 5432,
  });

  // Ensure uploads directory exists
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // File Storage with Multer
  const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    },
  });

  // File Type Validation
  const fileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only PDFs and images are allowed!'), false);
    }
    cb(null, true);
  };

  const upload = multer({ storage, fileFilter });

  // Compute SHA-256 File Hash
  const computeFileHash = (filePath) => {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  };

  // Upload File Endpoint
  app.post('/upload', upload.single('document'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

      let { userId, status } = req.body;

      console.log('Received userId:', userId, 'Type:', typeof userId); // ✅ Debugging log

      // Convert userId to integer
      userId = parseInt(userId, 10);
      if (isNaN(userId)) {
        //.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Invalid User ID!' });
      }

      // Check if user exists in database
      const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'User does not exist!' });
      }

      // Compute file hash
      const fileHash = await computeFileHash(req.file.path);

      // Check for duplicate file
      const duplicateCheck = await pool.query('SELECT * FROM uploads WHERE file_hash = $1', [fileHash]);
      if (duplicateCheck.rows.length > 0) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Fraud detected: Duplicate document uploaded!' });
      }

      // Get file size
      const fileSize = fs.statSync(req.file.path).size;

      // Insert into database
      await pool.query(
        'INSERT INTO uploads (filename, file_hash, upload_time, size, user_id, status) VALUES ($1, $2, NOW(), $3, $4, $5)',
        [req.file.filename, fileHash, fileSize, userId, status]
      );

      res.json({
        message: 'File uploaded successfully!',
        fileUrl: `http://localhost:5000/uploads/${req.file.filename}`,
      });
    } catch (error) {
      console.error('Upload Error:', error);
      res.status(500).json({ message: 'Error uploading file: ' + error.message });
    }
  });


  // List Uploaded Files Endpoint
  app.get('/uploads', async (req, res) => {
    try {
      const result = await pool.query('SELECT filename, size, upload_time FROM uploads ORDER BY upload_time DESC');
      res.json(
        result.rows.map((file) => ({
          filename: file.filename,
          size: file.size,
          uploadDate: file.upload_time,
        }))
      );
    } catch (error) {
      console.error('Error retrieving files:', error);
      res.status(500).send('Error retrieving uploaded files');
    }
  });

  // Delete File Endpoint
  app.delete('/uploads/:filename', async (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);

    try {
      // Check if the file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
      }

      // Delete the file from the file system
      fs.unlinkSync(filePath);

      // Remove metadata from the database
      await pool.query('DELETE FROM uploads WHERE filename = $1', [filename]);

      res.status(200).send('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).send('Error deleting file');
    }
  });

  // Home Route
  app.get('/', (req, res) => {
    res.send('<h1>Welcome to Identity Verification Backend</h1><p>Use <a href="/uploads">/uploads</a> to view files.</p>');
  });

  // Start Server
  const PORT = 5000;
  app.listen(PORT, () => {
    console.log(`✅ Backend server running on http://localhost:${PORT}`);
  });
