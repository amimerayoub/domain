const fs = require('fs');
const path = require('path');

const numericHtml = fs.readFileSync(path.join(__dirname, '../numeric-domains.html'), 'utf8');
const geoHtml = fs.readFileSync(path.join(__dirname, '../geo-domains.html'), 'utf8');

console.log('--- Numeric Domains Verification ---');
console.log('Includes About Numeric:', numericHtml.includes('About Numeric Domain Generator'));
console.log('Includes About Geo:', numericHtml.includes('About Geo Domain Generator'));

console.log('\n--- Geo Domains Verification ---');
console.log('Includes About Geo:', geoHtml.includes('About Geo Domain Generator'));
console.log('Includes About Numeric:', geoHtml.includes('About Numeric Domain Generator'));
