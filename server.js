import express from 'express';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT;

app.use(express.json());

// Define a basic route
app.get('/', (req, res) => {
  res.send('Hello, World! Your Express server is running.');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
