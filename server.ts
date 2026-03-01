import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"]
    }
  });
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());

  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .maybeSingle();

      if (error) throw error;

      if (!users) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const passwordMatch = await bcrypt.compare(password, users.password);

      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      res.json({ id: users.id, username: users.username, role: users.role });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const { data: users, error } = await supabase
        .from("users")
        .select("id, username, role");

      if (error) throw error;
      res.json(users || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const { username, password, role } = req.body;

      const hashedPassword = await bcrypt.hash(password, 10);

      const { data: user, error } = await supabase
        .from("users")
        .insert([{ username, password: hashedPassword, role }])
        .select("id, username, role")
        .single();

      if (error) {
        if (error.message.includes("duplicate")) {
          return res.status(400).json({ error: "El usuario ya existe" });
        }
        throw error;
      }

      res.json(user);
    } catch (err: any) {
      console.error("Error creating user:", err);
      res.status(500).json({ error: "Error al crear usuario" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", parseInt(id));

      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting user:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/routes", async (req, res) => {
    try {
      const { data: routes, error } = await supabase
        .from("routes")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      res.json(routes || []);
    } catch (err) {
      console.error("Error fetching routes:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/routes/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, driver_name, preparer_name } = req.body;

      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (driver_name) updateData.driver_name = driver_name;
      if (preparer_name) updateData.preparer_name = preparer_name;

      const { data: updatedRoute, error } = await supabase
        .from("routes")
        .update(updateData)
        .eq("id", parseInt(id))
        .select()
        .single();

      if (error) throw error;

      io.emit("route_updated", updatedRoute);
      res.json(updatedRoute);
    } catch (err) {
      console.error("Error updating route:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/routes/batch-status", async (req, res) => {
    try {
      const { ids, status, driver_name, preparer_name } = req.body;

      if (!ids || ids.length === 0) {
        return res.json([]);
      }

      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (driver_name) updateData.driver_name = driver_name;
      if (preparer_name) updateData.preparer_name = preparer_name;

      const { data: updatedRoutes, error } = await supabase
        .from("routes")
        .update(updateData)
        .in("id", ids)
        .select();

      if (error) throw error;

      updatedRoutes?.forEach(route => io.emit("route_updated", route));
      res.json(updatedRoutes || []);
    } catch (err) {
      console.error("Error batch updating routes:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/requests", async (req, res) => {
    try {
      const { data: requests, error } = await supabase
        .from("carpet_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      res.json(requests || []);
    } catch (err) {
      console.error("Error fetching requests:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/requests", async (req, res) => {
    try {
      const { route_id, details, driver_name } = req.body;

      const { data: route, error: routeError } = await supabase
        .from("routes")
        .select("day_of_week, priority_number")
        .eq("id", route_id)
        .single();

      if (routeError) throw routeError;

      const { data: newRequest, error } = await supabase
        .from("carpet_requests")
        .insert([{
          route_id,
          details,
          driver_name,
          day_of_week: route?.day_of_week || "",
          priority_number: route?.priority_number || 0
        }])
        .select()
        .single();

      if (error) throw error;

      io.emit("request_created", newRequest);
      res.json(newRequest);
    } catch (err) {
      console.error("Error creating request:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/requests/:id/resolve", async (req, res) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from("carpet_requests")
        .delete()
        .eq("id", parseInt(id));

      if (error) throw error;

      io.emit("request_resolved", id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error resolving request:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/stock-issues", async (req, res) => {
    try {
      const { data: issues, error } = await supabase
        .from("stock_issues")
        .select("*")
        .order("reported_at", { ascending: false });

      if (error) throw error;
      res.json(issues || []);
    } catch (err) {
      console.error("Error fetching stock issues:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/stock-issues", async (req, res) => {
    try {
      const { item_name, issue_type } = req.body;

      const { error: insertError } = await supabase
        .from("stock_issues")
        .insert([{ item_name, issue_type }]);

      if (insertError) throw insertError;

      const { data: issues, error: fetchError } = await supabase
        .from("stock_issues")
        .select("*");

      if (fetchError) throw fetchError;

      io.emit("stock_updated", issues || []);
      res.json({ success: true });
    } catch (err) {
      console.error("Error creating stock issue:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/stock-issues/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const { error: deleteError } = await supabase
        .from("stock_issues")
        .delete()
        .eq("id", parseInt(id));

      if (deleteError) throw deleteError;

      const { data: issues, error: fetchError } = await supabase
        .from("stock_issues")
        .select("*");

      if (fetchError) throw fetchError;

      io.emit("stock_updated", issues || []);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting stock issue:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/reports/summary", async (req, res) => {
    try {
      const { data: routes, error: routesError } = await supabase
        .from("routes")
        .select("day_of_week, status");

      if (routesError) throw routesError;

      const { data: stockIssues, error: stockError } = await supabase
        .from("stock_issues")
        .select("*");

      if (stockError) throw stockError;

      const { data: requests, error: requestsError } = await supabase
        .from("carpet_requests")
        .select("day_of_week");

      if (requestsError) throw requestsError;

      const daily = routes?.reduce((acc: any, route) => {
        const existing = acc.find((d: any) => d.day_of_week === route.day_of_week);
        if (existing) {
          existing.total += 1;
          if (route.status === "done") existing.done += 1;
        } else {
          acc.push({
            day_of_week: route.day_of_week,
            total: 1,
            done: route.status === "done" ? 1 : 0
          });
        }
        return acc;
      }, []) || [];

      res.json({ daily, stock: stockIssues || [], carpetRequests: requests || [] });
    } catch (err) {
      console.error("Error fetching reports:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

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
    console.log(`Connected to Supabase at ${supabaseUrl}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
