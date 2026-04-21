
const http = require('http');
http.get('http://localhost:5002/api/users', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const users = JSON.parse(data);
      console.log('Total users:', users.length);
      const sample = users.find(u => u.type === 'brgy_official' || u.type === 'brgy official' || u.email.includes('+6'));
      console.log(JSON.stringify(sample || users[0], null, 2));
    } catch (e) {
      console.log('Error parsing JSON:', data.substring(0, 200));
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
