// perform CRUD operations on a file system using Node.js
import fs from 'fs';
const fileName = 'student.txt';
async function createFile() {
    try {
        await fs.promises.writeFile(fileName, 'Hello, this is a sample file for CRUD operations.');
        console.log('File created successfully.');
    } 
    catch (error) {
        console.error('Error creating file:', error);
    }
}
async function readFile() {
    try {
        const data = await fs.readFile(fileName, 'utf8');
        console.log('File read successfully.');
        console.log('File contents:', data);
    }
    catch (error) {
        console.error('Error reading file:', error);
    }
}