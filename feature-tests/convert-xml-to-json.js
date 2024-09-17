const fs = require('fs');
const xml2js = require('xml2js');

const xmlFilePath = './results/report.xml'; // Path to your XML report
const jsonFilePath = './results/cucumber-report.json'; // Path where JSON will be saved

// Read the XML file
fs.readFile(xmlFilePath, 'utf8', (err, xmlData) => {
  if (err) {
    console.error('Error reading XML file:', err);
    return;
  }

  // Parse XML to JSON
  xml2js.parseString(xmlData, (err, jsonData) => {
    if (err) {
      console.error('Error parsing XML to JSON:', err);
      return;
    }

    // Write JSON to file
    fs.writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2), (err) => {
      if (err) {
        console.error('Error writing JSON file:', err);
        return;
      }

      console.log('XML converted to JSON successfully.');
    });
  });
});
