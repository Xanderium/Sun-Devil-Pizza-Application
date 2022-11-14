// Imports
const dotenv = require("dotenv");  // For accessing process environment
const path = require("path");   // For ensuring correct paths are used per OS
const mongoose = require("mongoose");   // For accessing the app database
const User = require("./models/user.js");   // User model
const Order = require("./models/order.js");   // Order model
const express = require("express"); // Used to serve website content to user over HTTP
const session = require("express-session"); // For tracking user session data
const { body, validationResult } = require("express-validator");    // For validating user input
const bodyParser = require("body-parser");  // For parsing request bodies
const bcrypt = require("bcrypt");   // For hasing passwords
const nodemailer = require("nodemailer");   // For sending emails to customers

// Configure dotenv
dotenv.config();

// Set hashing salt rounds
const saltRounds = 10;

// Create transporter for sending emails via nodemailer
var transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "lucaseastman02@gmail.com",
        pass: process.env.EMAIL_PASS
    }
});

// Connect to database
// TO-DO: Implement process environment for security
const dbURI = process.env.DB_URI;
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true }).then(result => {
    console.log("Connected to database...");
    // Begin listening on 3000
    app.listen(3000, () => {
        console.log("Listening on port 3000...");
    });
}).catch(console.error);

// Create web app
const app = express();

// Add middleware for tracking session data and prasing request bodies
app.use(session({
    // TO-DO: Implement use of .env secret
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(bodyParser.json({ extended: true }));

// GET Requests

// "/cart" - View cart
app.get("/cart", (req, res) => {
    res.send({ cart: req.session.cart });
    // TO-DO: Display cart to user
});

// "/checkout" - Checkout form
app.get("/checkout", (req, res) => {
    // If cart is empty, send cost of no items
    if(!req.session.cart) {
        res.send({ cartCost: 0, tax: 0 });
        return;
    }
    // Get session cart
    const cart = req.session.cart;
    // Calculate cart cost
    var cartCost = 0;
    for(var i = 0; i < cart.length; i++) {
        cartCost += 11;
        if(Array.isArray(cart[i].toppings)) cartCost += cart[i].toppings.length;
    }
    // Calculate tax and total
    var tax = Math.ceil(cartCost * 0.1 * 100) / 100;
    var total = cartCost + tax;
    // Send cart subtotal, tax, and total
    res.send({ subtotal: cartCost, tax: tax, total: total });
});

// "/readyToCook" - Endpoint for retrieving ready-to-cook orders for the chef page
app.get("/readyToCook", (req, res) => {
    Order.find({ status: 1 }).then(result => {
        var orders = [];
        for(var i = 0; i < result.length; i++) {
            orders.push({
                orderNum: 0,
                items: result[i].items
            });
        }
        res.send(orders);
    }).catch(console.error);
});

// "/cooking" - Endpoint for retrieving orders currently cooking for the chef page
app.get("/cooking", (req, res) => {
    Order.find({ status: 2 }).then(result => {
        var orders = [];
        for(var i = 0; i < result.length; i++) {
            orders.push({
                orderNum: 0,
                items: result[i].items
            });
        }
        res.send(orders);
    }).catch(console.error);
});

// "/accepted" - Endpoint for retrieving accepted orders for the OP page
app.get("/accepted", (req, res) => {
    Order.find({ status: 0 }).then(result => {
        var orders = [];
        for(var i = 0; i < result.length; i++) {
            orders.push({
                id: result[i]._id,
                orderNum: 0,
                items: result[i].items,
                name: result[i].firstName + " " + result[i].lastName,
                asuID: result[i].asuID,
                pickupTime: result[i].pickupTime
            });
        }
        res.send(orders);
    }).catch(console.error);
});

// "/finished" - Endpoint for retrieving finished orders for the OP page
app.get("/finished", (req, res) => {
    Order.find({ status: 3 }).then(result => {
        var orders = [];
        for(var i = 0; i < result.length; i++) {
            orders.push({
                orderNum: 0,
                items: result[i].items,
                name: result[i].firstName + " " + result[i].lastName,
                asuID: result[i].asuID,
                pickupTime: result[i].pickupTime
            });
        }
        res.send(orders);
    }).catch(console.error);
});

// POST Requests

// "/addToCart" - Endpoint for adding item to cart
app.post("/addToCart", body("type").custom(validType), body("toppings").custom(validToppings), (req, res) => {
    var errors = validationResult(req).errors;
    // If any errors are found, alert user appropriately
    if(errors.length > 0) {
        console.log(errors);
        res.sendStatus(400);
        // TO-DO: Send order form to user with appropriate error messages
        return;
    }
    // Otherwise, continue handling request
    var newItem = req.body;
    // If no toppings were selected, add empty array for toppings to item
    if(!newItem.toppings) newItem.toppings = [];
    // Add item to session cart
    if(!req.session.cart) req.session.cart = [newItem];
    else req.session.cart.push(newItem);
    
    res.redirect("/cart");
});

// "/register" - Endpoint for registering new employee account
app.post("/register", (req, res) => {
    if(req.body.admin !== "passwordlol") {
        res.sendStatus(403);
        return;
    }
    if(!req.body.username || !req.body.password) {
        res.sendStatus(400);
        return;
    }
    bcrypt.genSalt(saltRounds, (error, salt) => {
        if(error) {
            console.error(error);
            return;
        }
        bcrypt.hash(req.body.password, salt, (error, hash) => {
            if(error) {
                console.error(error);
                return;
            }
            const newUser = new User({
                username: req.body.username,
                password: hash,
                role: req.body.role
            });
            newUser.save().then(result => {
                res.sendStatus(200);
            }).catch(console.error);
        });
    });
});

// "/login" - Endpoint for employee login
app.post("/login", (req, res) => {
    var credentials = req.body;
    User.findOne({ username:credentials.username }).then(result => {
        // If account can not be found, send error message
        if(!result) {
            // TO-DO Send login page to user with error message
            res.sendStatus(403);
            return;
        }
        bcrypt.compare(req.body.password, result.password, (error, matches) => {
            // If password doesn't match, send error message
            if(!matches) {
                res.sendStatus(403);
                // TO-DO Send login page to user with error message
                return;
            }
            // Depending on role, send user to appropriate page
            switch(result.role) {
                case 0:
                    req.session.permissions = 0;
                    res.send("OP");
                    // TO-DO Send user to order processor page
                    break;
                case 1:
                    req.session.permissions = 1;
                    res.send("Chef");
                    // TO-DO Send user to chef page
                    break;
                default:
                    req.session.permissions = 0;
                    res.send("OP");
                    // TO-DO Send user to order processor page
                    break;
            }
            // res.sendStatus(200);
        });
    }).catch(console.error);
});

var lastestOrderNumber = 1;
// "/checkout" - Endpoint for checking out
app.post("/checkout", (req, res) => {
    req.body.items = req.session.cart;
    // Create a new order given checkout details
    const newOrder = new Order({
        orderNumber: ++lastestOrderNumber,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        cardNumber: req.body.cardNumber,
        cardExpiration: new Date(req.body.expirationYear, req.body.expirationMonth - 1),
        cardCVV: req.body.cardCVV,
        asuID: req.body.asuID,
        items: req.session.cart,
        pickupTime: new Date() + 3600
    });
    // Save order in database
    newOrder.save().then(result => {
        // Redirect user to customer page after checkout
        res.redirect("/customer");
    }).catch(console.error);
});

// "/incrementStatus" - Endpoint for incrementing status of a given order
app.post("/incrementStatus", (req, res) => {
    Order.findOne({ _id:req.body.id }).then(result => {
        // If order is archived, send Bad Request error
        if(result.status >= 3) {
            res.sendStatus(400);
            return;
        }
        Order.updateOne({ _id:req.body.id }, { $inc: { status: 1 } }).then(result2 => {
            // If order status was 3, send email to customer letting them know their order is ready
            if(result.status === 2) {
                var orderDetails = "";
                var cost = 0;
                for(var i = 0; i < result.items.length; i++) {
                    var curItem = result.items[i];
                    var toppings = "";
                    var toppingsCost = 0;
                    for(var j = 0; j < curItem.toppings.length; j++) {
                        var curTopping = curItem.toppings[j];
                        toppings += (j === 0 ? "" : ", ") + (j === curItem.toppings.length - 1 ? "and " : "") + curTopping.toLowerCase();
                        toppingsCost++;
                    }
                    orderDetails += "1 " + result.items[i].type + " pizza" + (toppings.length ? " with " + toppings : "") + " - $" + (11 + toppingsCost) + "\n";
                    cost += 11 + toppingsCost;
                }
                var mailOptions = {
                    from: "lucaseastman02@gmail.com",
                    to: result.email,
                    subject: "Order Ready",
                    text: "Hello " + result.firstName + ",\n\nYour Sun Devil Pizza order is ready for pickup.\n\nOrder Receipt:\n" + orderDetails + "Subtotal: $" + cost + "\nTax: $" + (Math.round(cost * 0.1 * 100) / 100) + "\nTotal: $" + (Math.round(cost * 1.1 * 100) / 100)
                }
                transporter.sendMail(mailOptions, (error, info) => {
                    if(error) {
                        console.error(error);
                        return;
                    }
                });
            }
            res.sendStatus(200);
        }).catch(console.error);
    }).catch(console.error);
});

// All other requests
app.get("*", (req, res) => {
    res.sendStatus(404);
    // TO-DO: Send 404 error page to user
});

// Custom form validation functions

// Validate pizza type
function validType(value) {
    // If pizza type does not match any of allowed types, return false
    if(!["Pepperoni", "Vegetable", "Cheese"].includes(value)) {
        return false;
    }
    return true;
}

// Validate pizza toppings
function validToppings(values) {
    // If no toppings, return true
    if(!values) return true;
    // If any toppings don't match toppings allowed, return false
    for(var i = 0; i < values.length; i++) {
        if(!["Mushroom", "Onions", "Olives", "Extra Cheese"].includes(values[i])) {
            console.log(values[i]);
            return false;
        }
    }
    // Otherwise, return true
    return true;
}