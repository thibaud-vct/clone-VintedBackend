const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;
const isAuthenticated = require("../middleware/isAuthenticated");

const Offer = require("../models/Offer");
const User = require("../models/User");

router.post("/offer/publish", isAuthenticated, async (req, res) => {
    try {
        // We filter data that is too long to create an ad
        if (
            req.fields.title.length <= 50 &&
            req.fields.description.length <= 500 &&
            req.fields.price <= 100000
        ) {
            // We explode the Body object received by key (Destructuring assignment)
            const {
                title,
                description,
                price,
                brand,
                size,
                condition,
                color,
                city,
            } = req.fields;
            // We create a new offer with all the data received in newOffer
            const newOffer = new Offer({
                product_name: title,
                product_description: description,
                product_price: price,
                product_details: [
                    { MARQUE: brand },
                    { TAILLE: size },
                    { ETAT: condition },
                    { COULEUR: color },
                    { EMPLACEMENT: city },
                ],
                owner: req.user,
            });
            // We upload the file to our Cloudinary cloud with a specific path
            const file = await cloudinary.uploader.upload(
                // faille à amelioré ------
                req.files.picture.path,
                {
                    folder: `/vinted/offers/${newOffer._id}`,
                }
            );
            // We add the Return object of Cloudinary in our newOffer
            newOffer.product_image = file;
            // We save newOffer in the database
            await newOffer.save();
            // We send the newOffer to the customer
            res.status(200).json({ newOffer });
        } else {
            res.status(401).json({
                message: "information too long",
            });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.put("/offer/edit/:id", isAuthenticated, async (req, res) => {
    try {
        // We explode the Body object received by key (Destructuring assignment)
        const {
            title,
            description,
            price,
            brand,
            size,
            condition,
            color,
            city,
        } = req.fields;
        // We retrieve the offer to modify in the BDD
        const editOffer = await Offer.findById(req.params.id);
        // If the data to be modified is present, we modify the offer
        if (title && title.length <= 50) {
            editOffer.product_name = title;
        }
        if (description && description.length <= 500) {
            editOffer.product_description = description;
        }
        if (price && price <= 100000) {
            console.log("modifier le prix");
            editOffer.product_price = price;
        }
        // We are looking for the right location of the "key" in Array of "produc_details" to modify the detail if it is sent
        const details = editOffer.product_details;
        for (i = 0; i < details.length; i++) {
            console.log(details[i].TAILLE);
            if (details[i].MARQUE) {
                if (brand) {
                    details[i].MARQUE = brand;
                }
            }
            if (details[i].TAILLE) {
                if (size) {
                    details[i].TAILLE = size;
                }
            }
            if (details[i].ETAT) {
                if (condition) {
                    details[i].ETAT = condition;
                }
            }
            if (details[i].COULEUR) {
                if (color) {
                    details[i].COULEUR = color;
                }
            }
            if (details[i].EMPLACEMENT) {
                if (city) {
                    details[i].EMPLACEMENT = city;
                }
            }
        }
        // Notify Mongoose that we have modified a Array
        editOffer.markModified("product_details");
        // We download the new image and we modify the new path to the offer
        if (req.files.picture) {
            const file = await cloudinary.uploader.upload(
                req.files.picture.path,
                {
                    folder: `/vinted/offers/${editOffer._id}`,
                }
            );
            editOffer.product_image = { secure_url: file.secure_url };
        }
        // We save editOffer in the database
        await editOffer.save();
        // We send the editOffer to the customer
        res.status(200).json(editOffer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Filter offers
router.get("/offers", async (req, res) => {
    try {
        // We manage the case we do not .sort() and we delete "price-"
        let sort = "";
        if (req.query.sort) {
            sort = req.query.sort.replace("price-", "");
        }
        // We give default value to priceMin and priceMax otherwise we assign them the value sent
        let priceMin = 0;
        let priceMax = Infinity;
        if (req.query.priceMin) {
            priceMin = Number(req.query.priceMin);
        }
        if (req.query.priceMax) {
            priceMax = Number(req.query.priceMax);
        }
        // Standardize the number of Offers per page and increase each page change
        let page = 0;
        let numberOfOffers = 25;
        if (req.query.numberOfOffers <= 25) {
            numberOfOffers = 25;
        } else if (
            req.query.numberOfOffers > 25 &&
            req.query.numberOfOffers <= 50
        ) {
            numberOfOffers = 50;
        } else if (req.query.numberOfOffers > 50) {
            numberOfOffers = 100;
        }
        page = (req.query.page - 1) * numberOfOffers;
        // We create an Object for word searches and prices
        let filter = {
            product_name: new RegExp(req.query.title, "i"),
            product_price: {
                $gte: priceMin,
                $lte: priceMax,
            },
        };
        // We launch the search in the database to find the number of offers
        const countOffers = await Offer.countDocuments(filter);
        // We launch the search in the database for create an offers' array
        const offers = await Offer.find(filter)
            .sort({
                product_price: sort,
            })
            .limit(numberOfOffers)
            .skip(page)
            .populate("owner", "account");
        // We return the number of offers and a offers' array
        res.status(200).json({ count: countOffers.length, offers: offers });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.get("/offer/:id", async (req, res) => {
    try {
        if (req.params.id) {
            const offer = await Offer.findById(req.params.id).populate(
                "owner",
                "account"
            );
            res.status(200).json(offer);
        } else {
            res.status(404).json({ message: "no offer with this id" });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete("/offer/delete/:id", isAuthenticated, async (req, res) => {
    try {
        console.log(req.params.id);
        // Vider le dossier de l'offre
        await cloudinary.api.delete_resources_by_prefix(
            `/vinted/offers/${req.params.id}`,
            function (error, result) {
                console.log(result, error);
            }
        );
        console.log("Fichier del");
        // Supprimer le dossier de l'offre
        await cloudinary.api.delete_folder(
            `/vinted/offers/${req.params.id}`,
            function (error, result) {
                console.log(result, error);
            }
        );
        console.log("dossier del");
        // Rechercher Offre dans la BDD
        let deleteOffer = await Offer.findById(req.params.id);
        // Supprimer de la BDD
        console.log("offer ", deleteOffer);
        await deleteOffer.delete();

        res.status(200).json("Offer deleted succesfully");
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});
module.exports = router;
