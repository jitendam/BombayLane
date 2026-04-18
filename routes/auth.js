const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Assuming a User model is defined
const router = express.Router();

// Replace 'your_jwt_secret' with your actual secret key
const JWT_SECRET = 'your_jwt_secret';

// User Registration
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
});

// User Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Verify user
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Validate password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
    
    res.status(200).json({ token });
});

module.exports = router;
