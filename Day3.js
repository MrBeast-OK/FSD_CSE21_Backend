// Promise object is used for asynchronous computations.
// It represents a value that may be available now, or in the future, or never.
const promiseOne = new Promise((resolve, reject) => {
    // Simulating an asynchronous operation using setTimeout
    setTimeout(() => {
        const success = true;
        if (success) {
            resolve("Promise resolved successfully!");
        } else {
            reject("Promise rejected!");
        }
    }, 2000);
});