const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
    try {
        if (req.headers.authorization) {
            // On récupere le token au bon format
            const token = req.headers.authorization.replace("Bearer ", "");
            // On recherche le token des la BDD
            const user = await User.findOne({ token: token }).select(
                "account email token"
            );
            if (user) {
                // On récupere le user au passage pour le mettre dans le req
                req.user = user;
                return next();
            } else {
                res.status(401).json({ message: "Unauthorized" });
            }
        } else {
            res.status(401).json({ message: "Unauthorized" });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = isAuthenticated;
