✨ # Générateur de Codes QR

Une application web moderne pour générer des codes QR à partir d'images ou de fichiers PDF. Les codes QR redirigent automatiquement vers [https://e-impots.gouv.ci/](https://e-impots.gouv.ci/).

## 🎯 Fonctionnalités

- ✅ Upload d'images (JPG, PNG, GIF) et PDF
- ✅ Génération automatique de codes QR
- ✅ Redirection vers e-impots.gouv.ci
- ✅ Stockage des uploads dans PostgreSQL
- ✅ Historique des uploads
- ✅ Téléchargement des codes QR
- ✅ Interface responsive et intuitive
- ✅ Gestion des fichiers multiples

## 📋 Prérequis

- **Node.js** (v14+)
- **PostgreSQL** (v12+)
- **npm** ou **yarn**

## 🚀 Installation

### 1. Cloner le repository

```bash
git clone https://github.com/blejacques2704-crypto/qr-code-generator.git
cd qr-code-generator
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer PostgreSQL

```bash
createdb qr_generator
```

### 4. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Éditer `.env` et remplir les informations :

```env
PORT=3000
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qr_generator
QR_REDIRECT_URL=https://e-impots.gouv.ci/
NODE_ENV=development
```

### 5. Démarrer l'application

```bash
# Mode développement
npm run dev

# Mode production
npm start
```

L'application sera accessible à `http://localhost:3000`

## 📁 Structure du projet

```
qr-code-generator/
├── public/
│   ├── index.html          # Page HTML principale
│   ├── style.css           # Styles CSS
│   └── app.js              # Logique frontend
├── uploads/                # Dossier des fichiers uploadés
├── server.js               # Serveur Express
├── package.json            # Dépendances du projet
├── .env.example            # Configuration exemple
├── .gitignore              # Fichiers à ignorer
└── README.md               # Ce fichier
```

## 🔧 API Endpoints

### Upload d'un fichier
```http
POST /api/upload
Content-Type: multipart/form-data

file: <image or pdf file>
```

**Réponse :**
```json
{
  "success": true,
  "message": "Fichier uploadé avec succès",
  "data": {
    "id": 1,
    "filename": "example.jpg",
    "qrCode": "data:image/png;base64,..."
  }
}
```

### Récupérer tous les uploads
```http
GET /api/uploads
```

### Récupérer un upload spécifique
```http
GET /api/uploads/:id
```

### Télécharger le QR code
```http
GET /api/download-qr/:id
```

### Supprimer un upload
```http
DELETE /api/uploads/:id
```

## 📊 Base de données

La table `uploads` est créée automatiquement avec la structure suivante :

```sql
CREATE TABLE uploads (
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
```

## 🌐 Déploiement

### Heroku
```bash
heroku create your-app-name
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
heroku run npm run init-db
```

### Docker
```bash
docker build -t qr-generator .
docker run -p 3000:3000 --env-file .env qr-generator
```

## 🔒 Sécurité

- Validation des types de fichiers (MIME types)
- Limite de taille de fichiers (50MB par défaut)
- Protection contre les injections SQL
- Gestion des erreurs sécurisée
- CORS configuré

## 🐛 Dépannage

### Erreur de connexion à PostgreSQL
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution :**
- Vérifier que PostgreSQL est en cours d'exécution
- Vérifier les identifiants dans `.env`
- Vérifier que la base de données existe

### Port déjà utilisé
```
Error: listen EADDRINUSE :::3000
```

**Solution :**
- Changer le PORT dans `.env`
- Ou tuer le processus utilisant le port 3000

## 📝 Licence

MIT License

## 👨‍💻 Auteur

**blejacques2704-crypto**

## 🤝 Contribution

Les contributions sont bienvenues ! Veuillez :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Pousser vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

---

**Version:** 1.0.0  
**Dernière mise à jour:** 2026-06-05