function GreetingHandler() {
    "use strict";

    // Intentional vulnerability (demo): reflected XSS via unescaped query parameter
    this.greet = (req, res) => {
        const name = req.query.name;
        res.send("<h1>Welcome back, " + name + "!</h1>");
    };
}

module.exports = GreetingHandler;
