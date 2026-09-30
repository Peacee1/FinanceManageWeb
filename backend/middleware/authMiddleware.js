const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_tam_thoi');
      req.user = decoded; // { userId, role }
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Khong co quyen truy cap, token khong hop le' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Khong co quyen truy cap, khong co token' });
  }
};

// Middleware chi cho chu quan (owner)
const ownerOnly = (req, res, next) => {
  if (req.user && req.user.role === 'owner') {
    next();
  } else {
    res.status(403).json({ message: 'Chi chu quan moi co quyen thuc hien thao tac nay.' });
  }
};

module.exports = { protect, ownerOnly };
