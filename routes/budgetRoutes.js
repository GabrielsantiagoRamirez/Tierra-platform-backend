const express = require("express");
const router = express.Router();
const budgetController = require("../controllers/budgetController");

router.post("/create", budgetController.createBudget);
router.get("/list", budgetController.listBudgets);
router.get("/list/:page", budgetController.listBudgets);
router.get("/:id", budgetController.getBudgetByid);
router.put("/:id", budgetController.updateBudget);
router.delete("/:id", budgetController.deleteBudget);

module.exports = router;
