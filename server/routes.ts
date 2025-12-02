import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { insertCarSchema, insertRentalSchema, insertExpenseSchema, insertCustomerSchema } from "@shared/schema";
import { z } from "zod";
import type { User } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup local authentication
  setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Car routes
  app.get("/api/cars", isAuthenticated, async (req, res) => {
    try {
      const cars = await storage.getAllCars();
      res.json(cars);
    } catch (error) {
      console.error("Error fetching cars:", error);
      res.status(500).json({ message: "Failed to fetch cars" });
    }
  });

  app.get("/api/cars/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const car = await storage.getCarById(id);
      if (!car) {
        return res.status(404).json({ message: "Car not found" });
      }
      res.json(car);
    } catch (error) {
      console.error("Error fetching car:", error);
      res.status(500).json({ message: "Failed to fetch car" });
    }
  });

  app.post("/api/cars", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validated = insertCarSchema.parse(req.body);
      const car = await storage.createCar(validated);
      res.status(201).json(car);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid car data", errors: error.errors });
      }
      console.error("Error creating car:", error);
      res.status(500).json({ message: "Failed to create car" });
    }
  });

  app.patch("/api/cars/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      
      const id = parseInt(req.params.id);
      
      // Only allow non-admins to update plateNumber and currentMileage
      if (!user?.isAdmin) {
        const allowedFields = ['plateNumber', 'currentMileage'];
        const requestedFields = Object.keys(req.body);
        const hasDisallowedFields = requestedFields.some(field => !allowedFields.includes(field));
        if (hasDisallowedFields) {
          return res.status(403).json({ message: "Only admins can modify car status or other fields" });
        }
      }

      const car = await storage.updateCar(id, req.body);
      if (!car) {
        return res.status(404).json({ message: "Car not found" });
      }
      res.json(car);
    } catch (error) {
      console.error("Error updating car:", error);
      res.status(500).json({ message: "Failed to update car" });
    }
  });

  app.delete("/api/cars/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteCar(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting car:", error);
      res.status(500).json({ message: "Failed to delete car" });
    }
  });

  app.post("/api/cars/:id/oil-change", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      const car = await storage.recordOilChange(id);
      if (!car) {
        return res.status(404).json({ message: "Car not found" });
      }
      res.json(car);
    } catch (error) {
      console.error("Error recording oil change:", error);
      res.status(500).json({ message: "Failed to record oil change" });
    }
  });

  // Customer routes
  app.get("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomerById(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.get("/api/customers/:id/rentals", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomerById(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      const rentals = await storage.getCustomerRentals(id);
      res.json(rentals);
    } catch (error) {
      console.error("Error fetching customer rentals:", error);
      res.status(500).json({ message: "Failed to fetch customer rentals" });
    }
  });

  app.post("/api/customers", isAuthenticated, async (req: any, res) => {
    try {
      const validated = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validated);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.patch("/api/customers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      const validated = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(id, validated);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteCustomer(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Rental routes
  app.get("/api/rentals", isAuthenticated, async (req, res) => {
    try {
      const rentals = await storage.getAllRentals();
      res.json(rentals);
    } catch (error) {
      console.error("Error fetching rentals:", error);
      res.status(500).json({ message: "Failed to fetch rentals" });
    }
  });

  app.get("/api/rentals/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const rental = await storage.getRentalById(id);
      if (!rental) {
        return res.status(404).json({ message: "Rental not found" });
      }
      res.json(rental);
    } catch (error) {
      console.error("Error fetching rental:", error);
      res.status(500).json({ message: "Failed to fetch rental" });
    }
  });

  app.post("/api/rentals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const rentalData = {
        ...req.body,
        userId,
      };
      const validated = insertRentalSchema.parse(rentalData);
      
      // Check for duplicate or overlapping rental for the same car
      const allRentals = await storage.getAllRentals();
      const carRentals = allRentals.filter(r => r.carId === validated.carId);
      
      const newStart = new Date(validated.startDate);
      const newEnd = new Date(validated.endDate);
      
      for (const existing of carRentals) {
        const existStart = new Date(existing.startDate);
        const existEnd = new Date(existing.endDate);
        
        // Check for overlapping dates
        if ((newStart <= existEnd && newEnd >= existStart)) {
          return res.status(400).json({ 
            message: "This car has an overlapping rental during the selected dates" 
          });
        }
      }
      
      const rental = await storage.createRental(validated);
      res.status(201).json(rental);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid rental data", errors: error.errors });
      }
      console.error("Error creating rental:", error);
      res.status(500).json({ message: "Failed to create rental" });
    }
  });

  app.patch("/api/rentals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      const id = parseInt(req.params.id);
      const existing = await storage.getRentalById(id);

      if (!existing) {
        return res.status(404).json({ message: "Rental not found" });
      }

      // Only admin can edit finalized rentals
      if (existing.isFinalized && !user?.isAdmin) {
        return res.status(403).json({ message: "Only admin can edit finalized rentals" });
      }

      const rental = await storage.updateRental(id, req.body);
      res.json(rental);
    } catch (error) {
      console.error("Error updating rental:", error);
      res.status(500).json({ message: "Failed to update rental" });
    }
  });

  app.delete("/api/rentals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteRental(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting rental:", error);
      res.status(500).json({ message: "Failed to delete rental" });
    }
  });

  // Expense routes
  app.get("/api/expenses", isAuthenticated, async (req, res) => {
    try {
      const expenses = await storage.getAllExpenses();
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.get("/api/cars/:carId/expenses", isAuthenticated, async (req, res) => {
    try {
      const carId = parseInt(req.params.carId);
      const expenses = await storage.getExpensesByCarId(carId);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching car expenses:", error);
      res.status(500).json({ message: "Failed to fetch car expenses" });
    }
  });

  app.post("/api/expenses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const expenseData = {
        ...req.body,
        userId,
      };
      const validated = insertExpenseSchema.parse(expenseData);
      const expense = await storage.createExpense(validated);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid expense data", errors: error.errors });
      }
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.delete("/api/expenses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteExpense(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Monthly payments
  app.get("/api/monthly-payments", isAuthenticated, async (req, res) => {
    try {
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const payments = await storage.getMonthlyPayments(month, year);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching monthly payments:", error);
      res.status(500).json({ message: "Failed to fetch monthly payments" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id/toggle-admin", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = (req.user as User).id;
      const currentUser = await storage.getUser(currentUserId);
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetId = req.params.id;
      if (targetId === currentUserId) {
        return res.status(400).json({ message: "Cannot modify your own admin status" });
      }

      const user = await storage.toggleUserAdmin(targetId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error toggling admin:", error);
      res.status(500).json({ message: "Failed to toggle admin status" });
    }
  });

  app.get("/api/admin/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Object storage routes
  const objectStorageService = new ObjectStorageService();

  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  app.put("/api/payment-screenshots", isAuthenticated, async (req: any, res) => {
    try {
      if (!req.body.screenshotURL) {
        return res.status(400).json({ error: "screenshotURL is required" });
      }

      const userId = (req.user as User).id;
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.screenshotURL,
        {
          owner: userId,
          visibility: "public",
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting payment screenshot:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return httpServer;
}
