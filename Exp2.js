const fs = require('fs');
fs.writeFile("student.txt", "Name: Rahul\n Roll no: 101");
console.log("File Created Successfully");

let data = fs.readFileSync("student.txt", "utf8");

console.log("\nFile Content:");
console.log(data);

fs.appendFile("student.txt", "\nCourse: B.Tech CSE");
console.log("\nFile updated successfully");