const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { Package } = require('@s4tk/models');

// Try to find the actual name in CASP by looking for the pattern
function extractCaspName(buffer) {
  // The CASP structure has the name after a header
  // Try different approaches to find the name
  
  // Approach 1: Look for the pattern "BANK" in UTF-16LE (42 00 41 00 4E 00 4B 00)
  const bankPattern = Buffer.from('BANK', 'utf16le');
  const bankIndex = buffer.indexOf(bankPattern);
  if (bankIndex !== -1) {
    // Read from this position as UTF-16LE until null terminator
    const nameBuffer = buffer.slice(bankIndex);
    const nullIndex = nameBuffer.indexOf(Buffer.from('\0\0', 'binary'));
    if (nullIndex !== -1) {
      return nameBuffer.slice(0, nullIndex).toString('utf16le');
    }
    return nameBuffer.toString('utf16le').split('\0')[0];
  }
  
  // Approach 2: Original method at offset 12
  return buffer.toString('utf16le', 12).split('\0')[0];
}

const files = ['Short', 'Medium', 'Long'];
files.forEach(len => {
  const filepath = path.join('pubic_hair', `BTTB 7 Pubic Hair 3D Collection 1 ${len} by BANK42n.package`);
  const buffer = fs.readFileSync(filepath);
  const s4pkg = Package.from(buffer);
  const casps = s4pkg.entries.filter(e => e.key.type === 0x034AEECB);
  console.log(`\n${len} package (${casps.length} CASPs):`);
  casps.forEach(e => {
    const dec = zlib.inflateSync(e.value.bufferCache.buffer);
    const name = extractCaspName(dec);
    console.log(`  ${e.key.instance} - ${name}`);
  });
});
