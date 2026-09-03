const EventEmitter = require("events");

// Create EventEmitter object
const myEmitter = new EventEmitter();

// Create "greet" event
myEmitter.on("greet", (name) => {
    console.log("Hello, " + name + "!");
});

// Create "exit" event
myEmitter.on("exit", () => {
    console.log("Exit event triggered.");
});

// Trigger greet event
myEmitter.emit("greet", "Krishna");

// Trigger exit event
myEmitter.emit("exit");

//--------------------------------------------------

const EventEmitter = require("events");

// Create an event emitter
const button = new EventEmitter();

// Simulate click event
button.on("click", () => {
    console.log("Button was clicked!");
});

// Simulate mouseover event
button.on("mouseover", () => {
    console.log("Mouse is over the button!");
});

// Trigger events
console.log("Simulating events...");

button.emit("mouseover");
button.emit("click");
button.emit("click");

//----------------------------------------------------

console.log("1. Program started");

setTimeout(() => {
    console.log("4. setTimeout");
}, 0);

setImmediate(() => {
    console.log("5. setImmediate");
});

process.nextTick(() => {
    console.log("3. process.nextTick");
});

console.log("2. Program ended");