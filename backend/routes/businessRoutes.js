const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const {
  createBusiness, getMyBusiness, updateBusiness,
  addEmployee, listEmployees, updateEmployee, removeEmployee,
  addProduct, listProducts, updateProduct, removeProduct,
} = require('../controllers/businessController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'biz-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Chi cho phep upload anh.'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// Business profile
router.post('/create', protect, upload.single('avatar'), createBusiness);
router.get('/mine', protect, getMyBusiness);
router.put('/update', protect, upload.single('avatar'), updateBusiness);

// Employees
router.post('/employees', protect, upload.single('avatar'), addEmployee);
router.get('/employees', protect, listEmployees);
router.put('/employees/:id', protect, upload.single('avatar'), updateEmployee);
router.delete('/employees/:id', protect, removeEmployee);

// Products
router.post('/products', protect, upload.single('avatar'), addProduct);
router.get('/products', protect, listProducts);
router.put('/products/:id', protect, upload.single('avatar'), updateProduct);
router.delete('/products/:id', protect, removeProduct);

module.exports = router;
