require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const QRCode = require('qrcode');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// Configuration Multer pour uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers image (JPG, PNG, GIF) et PDF sont acceptés'));
    }
  }
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialiser la base de données
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS uploads (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_type VARCHAR(50),
        file_size BIGINT,
        qr_code_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Base de données initialisée');
  } catch (err) {
    console.error('Erreur lors de l\'initialisation de la BD:', err);
  }
}

// Routes

// Servir le fichier HTML principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload fichier et générer QR code
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier uploadé' });
    }

    const filename = req.file.filename;
    const originalName = req.file.originalname;
    const filePath = `/uploads/${filename}`;
    const fileType = req.file.mimetype;
    const fileSize = req.file.size;

    // Générer le QR code qui redirige vers e-impots
    const qrCodeUrl = process.env.QR_REDIRECT_URL || 'https://e-impots.gouv.ci/';
    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl);

    // Sauvegarder dans la BD
    const query = `
      INSERT INTO uploads (filename, original_name, file_path, file_type, file_size, qr_code_data)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, created_at;
    `;
    const result = await pool.query(query, [filename, originalName, filePath, fileType, fileSize, qrCodeDataUrl]);

    res.json({
      success: true,
      message: 'Fichier uploadé avec succès',
      data: {
        id: result.rows[0].id,
        filename: originalName,
        filePath: filePath,
        qrCode: qrCodeDataUrl,
        uploadedAt: result.rows[0].created_at
      }
    });

  } catch (err) {
    console.error('Erreur upload:', err);
    res.status(500).json({ error: 'Erreur lors de l\'upload: ' + err.message });
  }
});

// Récupérer tous les uploads
app.get('/api/uploads', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, original_name, file_path, file_type, file_size, qr_code_data, created_at FROM uploads ORDER BY created_at DESC LIMIT 50'
    );
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Erreur récupération uploads:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des uploads' });
  }
});

// Récupérer un upload spécifique
app.get('/api/uploads/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM uploads WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Upload non trouvé' });
    }
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur récupération upload:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

// Supprimer un upload
app.delete('/api/uploads/:id', async (req, res) => {
  try {
    const uploadResult = await pool.query(
      'SELECT file_path FROM uploads WHERE id = $1',
      [req.params.id]
    );

    if (uploadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Upload non trouvé' });
    }

    const filePath = path.join(__dirname, 'public', uploadResult.rows[0].file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await pool.query('DELETE FROM uploads WHERE id = $1', [req.params.id]);

    res.json({ success: true, message: 'Upload supprimé' });
  } catch (err) {
    console.error('Erreur suppression:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// Télécharger le QR code
app.get('/api/download-qr/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT original_name, qr_code_data FROM uploads WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Upload non trouvé' });
    }

    const { original_name, qr_code_data } = result.rows[0];
    const base64Data = qr_code_data.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const filename = path.parse(original_name).name + '-qr.png';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  } catch (err) {
    console.error('Erreur téléchargement QR:', err);
    res.status(500).json({ error: 'Erreur lors du téléchargement' });
  }
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: 'Erreur upload: ' + err.message });
  }
  res.status(500).json({ error: err.message });
});

// Démarrer le serveur
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📁 Uploads sauvegardés dans: ${uploadsDir}`);
    console.log(`🔗 Redirection QR vers: ${process.env.QR_REDIRECT_URL || 'https://e-impots.gouv.ci/'}\n`);
  });
});

module.exports = app;
