import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 5173;

app.use(express.static(join(__dirname, 'dist/public')));

app.get('/{*splat}', (req, res) => {
  res.sendFile(join(__dirname, 'dist/public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
