import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("logistics.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_of_week TEXT NOT NULL,
    priority_number INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, preparing, done
    driver_name TEXT,
    preparer_name TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Add preparer_name if it doesn't exist (for existing databases)
// SQLite doesn't have "IF NOT EXISTS" for ADD COLUMN, so we check first
try {
  const tableInfo = db.prepare("PRAGMA table_info(routes)").all() as any[];
  const hasPreparerName = tableInfo.some(col => col.name === 'preparer_name');
  if (!hasPreparerName) {
    console.log("Migrating: Adding preparer_name column to routes table...");
    db.exec("ALTER TABLE routes ADD COLUMN preparer_name TEXT");
  }
} catch (err) {
  console.error("Migration error:", err);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL -- driver, preparer, admin
  );

  CREATE TABLE IF NOT EXISTS carpet_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL,
    details TEXT NOT NULL,
    driver_name TEXT,
    status TEXT DEFAULT 'pending', -- pending, resolved
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES routes(id)
  );

  CREATE TABLE IF NOT EXISTS stock_issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL,
    issue_type TEXT NOT NULL, -- out_of_stock, discontinued
    reported_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed initial routes if empty
const count = db.prepare("SELECT COUNT(*) as count FROM routes").get() as { count: number };
if (count.count === 0) {
  const initialData = {
    "MONDAY": [3, 6, 59, 9, 8, 11, 12, 14, 58, 34, 37, 4, 5, 10, 43, 44, 7, 2, 97],
    "TUESDAY": [6, 7, 11, 59, 9, 12, 37, 55, 3, 4, 5, 8, 10, 41, 43, 52, 58, 2, 97],
    "WEDNESDAY": [3, 6, 10, 11, 59, 12, 9, 34, 37, 4, 5, 7, 8, 43, 44, 52, 55, 58, 2, 97],
    "THURSDAY": [3, 7, 8, 59, 11, 12, 9, 54, 34, 37, 4, 5, 6, 10, 43, 44, 2, 97],
    "FRIDAY": [3, 6, 7, 10, 11, 12, 9, 37, 52, 55, 34, 14, 58, 4, 5, 8, 41, 2, 97],
    "SATURDAY": [4, 5, 6, 7, 8, 9, 11, 37, 44, 58, 97],
    "SUNDAY": [4, 5, 6, 7, 11, 37, 55, 59]
  };

  const insert = db.prepare("INSERT INTO routes (day_of_week, priority_number) VALUES (?, ?)");
  for (const [day, priorities] of Object.entries(initialData)) {
    for (const p of priorities) {
      insert.run(day, p);
    }
  }
}

// Seed initial users if empty
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  const insertUser = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
  insertUser.run("driver", "driver123", "driver");
  insertUser.run("preparer", "prep123", "preparer");
  insertUser.run("admin", "admin123", "admin");
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer);
  const PORT = 3000;

  app.use(express.json());

  // Auth Routes
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;
    if (user) {
      res.json({ id: user.id, username: user.username, role: user.role });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // User Management Routes
  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT id, username, role FROM users").all();
    res.json(users);
  });

  app.post("/api/users", (req, res) => {
    const { username, password, role } = req.body;
    try {
      const result = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run(username, password, role);
      res.json({ id: result.lastInsertRowid, username, role });
    } catch (err: any) {
      if (err.message.includes("UNIQUE constraint failed")) {
        res.status(400).json({ error: "El usuario ya existe" });
      } else {
        res.status(500).json({ error: "Error al crear usuario" });
      }
    }
  });

  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // API Routes
  app.get("/api/routes", (req, res) => {
    const routes = db.prepare("SELECT * FROM routes").all();
    res.json(routes);
  });

  app.post("/api/routes/:id/status", (req, res) => {
    const { id } = req.params;
    const { status, driver_name, preparer_name } = req.body;
    db.prepare("UPDATE routes SET status = ?, driver_name = COALESCE(?, driver_name), preparer_name = COALESCE(?, preparer_name), updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(status, driver_name || null, preparer_name || null, id);
    const updatedRoute = db.prepare("SELECT * FROM routes WHERE id = ?").get();
    io.emit("route_updated", updatedRoute);
    res.json(updatedRoute);
  });

  app.get("/api/requests", (req, res) => {
    const requests = db.prepare(`
      SELECT cr.*, r.priority_number, r.day_of_week 
      FROM carpet_requests cr 
      JOIN routes r ON cr.route_id = r.id
      WHERE cr.status = 'pending'
    `).all();
    res.json(requests);
  });

  app.post("/api/requests", (req, res) => {
    const { route_id, details, driver_name } = req.body;
    const result = db.prepare("INSERT INTO carpet_requests (route_id, details, driver_name) VALUES (?, ?, ?)").run(route_id, details, driver_name || null);
    const newRequest = db.prepare(`
      SELECT cr.*, r.priority_number, r.day_of_week 
      FROM carpet_requests cr 
      JOIN routes r ON cr.route_id = r.id
      WHERE cr.id = ?
    `).get(result.lastInsertRowid);
    io.emit("request_created", newRequest);
    res.json(newRequest);
  });

  app.post("/api/requests/:id/resolve", (req, res) => {
    const { id } = req.params;
    db.prepare("UPDATE carpet_requests SET status = 'resolved' WHERE id = ?").run(id);
    io.emit("request_resolved", id);
    res.json({ success: true });
  });

  app.get("/api/stock-issues", (req, res) => {
    const issues = db.prepare("SELECT * FROM stock_issues").all();
    res.json(issues);
  });

  app.post("/api/stock-issues", (req, res) => {
    const { item_name, issue_type } = req.body;
    db.prepare("INSERT INTO stock_issues (item_name, issue_type) VALUES (?, ?)").run(item_name, issue_type);
    const issues = db.prepare("SELECT * FROM stock_issues").all();
    io.emit("stock_updated", issues);
    res.json({ success: true });
  });

  app.delete("/api/stock-issues/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM stock_issues WHERE id = ?").run(id);
    const issues = db.prepare("SELECT * FROM stock_issues").all();
    io.emit("stock_updated", issues);
    res.json({ success: true });
  });

  app.post("/api/routes/batch-status", (req, res) => {
    const { ids, status, driver_name, preparer_name } = req.body;
    if (!ids || ids.length === 0) {
      return res.json([]);
    }
    
    const update = db.prepare("UPDATE routes SET status = ?, driver_name = COALESCE(?, driver_name), preparer_name = COALESCE(?, preparer_name), updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    
    const transaction = db.transaction((ids, status, driver_name, preparer_name) => {
      for (const id of ids) {
        update.run(status, driver_name || null, preparer_name || null, id);
      }
    });

    transaction(ids, status, driver_name, preparer_name);
    
    const placeholders = ids.map(() => '?').join(',');
    const updatedRoutes = db.prepare(`SELECT * FROM routes WHERE id IN (${placeholders})`).all(...ids);
    updatedRoutes.forEach(route => io.emit("route_updated", route));
    res.json(updatedRoutes);
  });

  app.get("/api/reports/summary", (req, res) => {
    const daily = db.prepare(`
      SELECT day_of_week, 
             COUNT(*) as total, 
             SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done
      FROM routes 
      GROUP BY day_of_week
    `).all();

    const stock = db.prepare("SELECT * FROM stock_issues").all();
    
    const carpetRequests = db.prepare(`
      SELECT r.day_of_week, COUNT(*) as count 
      FROM carpet_requests cr
      JOIN routes r ON cr.route_id = r.id
      GROUP BY r.day_of_week
    `).all();

    res.json({ daily, stock, carpetRequests });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  io.on("connection", (socket) => {
    console.log("Client connected");
    socket.on("disconnect", () => console.log("Client disconnected"));
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
