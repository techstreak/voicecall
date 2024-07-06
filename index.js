const express = require("express");
const app = express();
const handlebars = require("express-handlebars");
const http = require("http").Server(app);
const io = require("socket.io")(http);
const path = require("path");

// To hold users' information
const socketsStatus = {};

// Configure Handlebars
const customHandlebars = handlebars.create({ layoutsDir: path.join(__dirname, "views/layouts") });

app.engine("handlebars", customHandlebars.engine);
app.set("view engine", "handlebars");

// Serve static files from the 'public' directory
app.use("/files", express.static(path.join(__dirname, "public")));

// Serve index.handlebars on the route '/home'
app.get("/home", (req, res) => {
    res.render("index");
});

// Socket.IO connection handling
io.on("connection", function (socket) {
    const socketId = socket.id;
    socketsStatus[socket.id] = {};

    console.log("User connected:", socketId);

    socket.on("voice", function (data) {
        var newData = data.split(";");
        newData[0] = "data:audio/ogg;";
        newData = newData[0] + newData[1];

        for (const id in socketsStatus) {
            if (id != socketId && !socketsStatus[id].mute && socketsStatus[id].online)
                socket.broadcast.to(id).emit("send", newData);
        }
    });

    socket.on("userInformation", function (data) {
        socketsStatus[socketId] = data;
        io.sockets.emit("usersUpdate", socketsStatus);
    });

    socket.on("disconnect", function () {
        delete socketsStatus[socketId];
        io.sockets.emit("usersUpdate", socketsStatus);
        console.log("User disconnected:", socketId);
    });
});

// Determine port dynamically (for Ngrok compatibility)
const PORT = process.env.PORT || 3000;

// Start the server
http.listen(PORT, () => {
    console.log(`App is running man ${PORT}!`);
});
