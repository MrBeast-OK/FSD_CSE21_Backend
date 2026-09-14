const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const studentsFile = path.join(__dirname, 'students.json');

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function readStudents() {
	try {
		const fileContent = fs.readFileSync(studentsFile, 'utf8');
		return fileContent.trim() ? JSON.parse(fileContent) : [];
	} catch (error) {
		if (error.code === 'ENOENT') {
			return [];
		}
		throw error;
	}
}

function sendHtml(response, statusCode, html) {
	response.writeHead(statusCode, { 'Content-Type': 'text/html; charset=utf-8' });
	response.end(html);
}

function formPage(message = '') {
	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Student Records</title>
</head>
<body>
	<h1>Student Records</h1>
	${message ? `<p>${escapeHtml(message)}</p>` : '<p>Welcome! Add a student record below.</p>'}
	<form method="post" action="/">
		<label>Student Name <input name="name" required></label><br>
		<label>Roll Number <input name="rollNumber" required></label><br>
		<label>Course <input name="course" required></label><br>
		<label>Email <input type="email" name="email" required></label><br>
		<button type="submit">Add Student</button>
	</form>
	<p><a href="/students">View student records</a></p>
</body>
</html>`;
}

function studentsPage() {
	const students = readStudents();
	const rows = students.length
		? students.map((student) => `<tr>
				<td>${escapeHtml(student.name)}</td>
				<td>${escapeHtml(student.rollNumber)}</td>
				<td>${escapeHtml(student.course)}</td>
				<td>${escapeHtml(student.email)}</td>
			</tr>`).join('')
		: '<tr><td colspan="4">No student records found.</td></tr>';

	return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Students</title></head>
<body>
	<h1>Student Records</h1>
	<table border="1">
		<thead><tr><th>Name</th><th>Roll Number</th><th>Course</th><th>Email</th></tr></thead>
		<tbody>${rows}</tbody>
	</table>
	<p><a href="/">Add another student</a></p>
</body>
</html>`;
}

const server = http.createServer((request, response) => {
	if (request.method === 'GET' && request.url === '/') {
		sendHtml(response, 200, formPage());
		return;
	}

	if (request.method === 'GET' && request.url === '/students') {
		try {
			sendHtml(response, 200, studentsPage());
		} catch (error) {
			sendHtml(response, 500, 'Unable to read student records.');
		}
		return;
	}

	if (request.method === 'POST' && request.url === '/') {
		let body = '';
		request.on('data', (chunk) => {
			body += chunk;
		});
		request.on('end', () => {
			const formData = new URLSearchParams(body);
			const student = {
				name: formData.get('name') || '',
				rollNumber: formData.get('rollNumber') || '',
				course: formData.get('course') || '',
				email: formData.get('email') || ''
			};

			try {
				const students = readStudents();
				students.push(student);
				fs.writeFileSync(studentsFile, `${JSON.stringify(students, null, 2)}\n`);
				sendHtml(response, 201, formPage('Student added successfully.'));
			} catch (error) {
				sendHtml(response, 500, 'Unable to save student record.');
			}
		});
		return;
	}

	sendHtml(response, 404, '<h1>404 - Page not found</h1>');
});

server.listen(PORT, () => {
	console.log(`Student records server is running at http://localhost:${PORT}`);
});
