import express from "express";\nimport routes from "./routes/index.js";\nconst app = express();\napp.use(express.json());\napp.use(routes);\nexport default app;
