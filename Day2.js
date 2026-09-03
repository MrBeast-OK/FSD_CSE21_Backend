//Synchronous & Asynchronous programming

//const hello = () => {
//    setTimeout(() => {
//        console.log("Hello, World!");
//    }, 2000);
//}
//hello();
//console.log("This is asynchronous code");
//--------------------------------------------

//callback, promise, async/await

function add(n1, n2, callback) {
    console.log(n1 + n2);
    if (typeof callback === "function") {
        callback();
    }
}

let a = 10;
let b = 20;

add(a, b, sayHi);
add(a, b, hello);
add(hello, sayHi); // This will throw an error because hello is not a number

function sayHi() {
    console.log("This is a callback function");
}

function hello() {
    console.log("Hello, World!");
}

//create a function display(callback) that print "Welcome to JavaScript"
function display(callback) {
    console.log("Welcome to JavaScript");
    if (typeof callback === "function") {
        callback();
    }
}