const express = require("express");
const router = express.Router();
const SHA256 = require("../node_modules/crypto-js/sha256");
const encBase64 = require("../node_modules/crypto-js/enc-base64");
const uid2 = require("../node_modules/uid2");

const User = require("../models/User");

router.post("/user/signup", async (req, res) => {
    try {
        // On vérifie que le mail à bien la bonne forme
        const regex = new RegExp(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, "g");
        if (
            regex.test(req.fields.email) &&
            req.fields.username &&
            req.fields.password
        ) {
            // On vérifie que le client existe pas dans la BDD avec son email
            const user = await User.findOne({ email: req.fields.email });
            if (!user) {
                // On génère un numbre aleatoire SALT
                const salt = uid2(64);
                // On génère le SHASH avec le mdp du client
                const hash = SHA256(req.fields.password + salt).toString(
                    encBase64
                );
                // On génère aussi un nombre aleatoire pour les cookie avec un TOKEN
                const token = uid2(64);
                // Création de la fiche client
                const newUser = new User({
                    email: req.fields.email,
                    account: {
                        username: req.fields.username,
                        phone: req.fields.phone,
                    },
                    token: token,
                    hash: hash,
                    salt: salt,
                });
                // Sauvegarde de la fiche client
                await newUser.save();

                res.status(200).json({
                    _id: newUser._id,
                    token: newUser.token,
                    account: newUser.account,
                });
            } else {
                res.status(400).json({
                    message: "Your mail is already in use",
                });
            }
        } else {
            res.status(400).json({ message: "Your data is not valide" });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.post("/user/login", async (req, res) => {
    try {
        // On vérifie que le mail à bien la bonne forme
        const regex = new RegExp(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, "g");
        if (regex.test(req.fields.email)) {
            // On va rechercher la fiche client avec son email
            const user = await User.findOne({ email: req.fields.email });
            if (user) {
                // On reconstruit le HASH avec le mdp du client
                const hash = SHA256(req.fields.password + user.salt).toString(
                    encBase64
                );
                // On compare le HASH du server avec le HASH reconstruit
                if (hash === user.hash) {
                    res.status(200).json({
                        _id: user._id,
                        token: user.token,
                        account: user.account,
                    });
                } else {
                    res.status(401).json({
                        message: "Your mail or password is not valide",
                    });
                }
            } else {
                res.status(401).json({
                    message: "Your mail or password is not valide",
                });
            }
        } else {
            res.status(401).json({
                message: "Your mail or password is not valide",
            });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
