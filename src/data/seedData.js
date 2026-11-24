// seedData.js — Initial default seed expenses for first-time application load
import { v4 as uuidv4 } from "uuid";

export const SEED_EXPENSES = [
  {
    id: uuidv4(),
    amount: 450,
    category: "food",
    date: "2026-11-24",
    note: "Lunch at the office cafeteria",
  },
  {
    id: uuidv4(),
    amount: 120,
    category: "transport",
    date: "2026-11-23",
    note: "Metro card recharge",
  },
  {
    id: uuidv4(),
    amount: 1800,
    category: "bills",
    date: "2026-11-22",
    note: "Electricity and internet broadband",
  },
  {
    id: uuidv4(),
    amount: 1200,
    category: "shopping",
    date: "2026-11-21",
    note: "Winter jacket & sneakers",
  },
  {
    id: uuidv4(),
    amount: 500,
    category: "entertainment",
    date: "2026-11-20",
    note: "Cinema tickets & snacks",
  },
];

export default SEED_EXPENSES;
