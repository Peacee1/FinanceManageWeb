const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { validateUpload } = require('../middleware/validateUpload');
const { protect, ownerOnly } = require('../middleware/authMiddleware');
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
  if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype) && /^\.(jpe?g|png|gif|webp)$/i.test(path.extname(file.originalname))) cb(null, true);
  else cb(new Error('Chi cho phep upload anh.'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// Business profile
router.post('/create', protect, ownerOnly, upload.single('avatar'), validateUpload, createBusiness);
router.get('/mine', protect, ownerOnly, getMyBusiness);
router.put('/update', protect, ownerOnly, upload.single('avatar'), validateUpload, updateBusiness);

// Employees
router.post('/employees', protect, ownerOnly, upload.single('avatar'), validateUpload, addEmployee);
router.get('/employees', protect, ownerOnly, listEmployees);
router.put('/employees/:id', protect, ownerOnly, upload.single('avatar'), validateUpload, updateEmployee);
router.delete('/employees/:id', protect, ownerOnly, removeEmployee);

// Products
router.post('/products', protect, ownerOnly, upload.single('avatar'), validateUpload, addProduct);
router.get('/products', protect, listProducts);
router.put('/products/:id', protect, ownerOnly, upload.single('avatar'), validateUpload, updateProduct);
router.delete('/products/:id', protect, ownerOnly, removeProduct);

module.exports = router;
