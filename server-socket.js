const socketIO = require("socket.io");
const config = require('./config/config');
const Express = require('express');
const App = Express();
const http = require("http");
const server = http.createServer(App);
const io = socketIO(server);
io.on("connection", socket => {
    //  console.log("New client connected" + socket.id);
    socket.on("location_update", () => {
        io.sockets.emit("location_change", "one location update");
    });

    socket.on("new_order_received", (employee) => {
        io.sockets.emit("new_branch_order", "one new order from " + employee);
    });

    socket.on("order_item_update", () => {
        io.sockets.emit("new_branch_order", "Orders has some changes");
    });

    // disconnect is fired when a client leaves the server
    socket.on("disconnect", () => {
        console.log("client disconnected");
    });
});

server.listen(config.socketPort, () => console.log(`Socket Listening on port ${config.socketPort}`));
