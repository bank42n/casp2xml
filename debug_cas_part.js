#!/usr/bin/env node

// Debug script to inspect CAS Part data from Sims 4 .package files
// This helps understand how to extract color information from CAS parts

const fs = require('fs');
const path = require('path');
const { Package } = require('@s4tk/models');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .option('input', {
    alias: 'i',
    description: 'Path to the .package file to inspect.',
    type: 'string',
    required: true
  })
  .help()
  .argv;

function main() {
  const packagePath = path.resolve(argv.input);

  if (!fs.existsSync(packagePath)) {
    console.error(`Package file not found: ${packagePath}`);
    return;
  }

  console.log(`Inspecting package: ${packagePath}`);

  try {
    const buffer = fs.readFileSync(packagePath);
    const s4pkg = Package.from(buffer);

    console.log(`Total entries in package: ${s4pkg.entries.length}`);
    const typeCounts = {};
    s4pkg.entries.forEach(entry => {
      const type = entry.key.type.toString(16).toUpperCase();
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    console.log('Resource types and counts:', typeCounts);

    // Inspect a few entries of other types
    const otherTypes = ['AC16FBEC', '15A1849', '3453CF95', 'BA856C78', 'B2D882'];
    otherTypes.forEach(typeHex => {
      const type = parseInt(typeHex, 16);
      const entries = s4pkg.entries.filter(e => e.key.type === type);
      if (entries.length > 0) {
        console.log(`\n--- Inspecting type ${typeHex} (first entry) ---`);
        const entry = entries[0];
        console.log(`Instance ID: ${entry.key.instance.toString()}`);
        console.log(`Group ID: ${entry.key.group.toString()}`);
        console.log('entry.value type:', typeof entry.value);
        if (entry.value && typeof entry.value === 'object' && entry.value.constructor.name) {
          console.log('Constructor:', entry.value.constructor.name);
        }
        if (entry.value && entry.value.bufferCache) {
          console.log('Has bufferCache, sizeDecompressed:', entry.value.bufferCache.sizeDecompressed);
        }
        // Try to parse as XmlResource if possible
        try {
          const { XmlResource, CombinedTuningResource } = require('@s4tk/models');
          if (entry.value instanceof XmlResource) {
            console.log('Already XmlResource');
          } else if (entry.value instanceof CombinedTuningResource) {
            console.log('Already CombinedTuningResource');
            console.log('Tuning content length:', entry.value.content.length);
            console.log('First 500 chars:', entry.value.content.substring(0, 500));
          } else if (Buffer.isBuffer(entry.value) || entry.value.bufferCache) {
            const buffer = entry.value.bufferCache ? entry.value.bufferCache.buffer : entry.value;
            // Try CombinedTuningResource first
            try {
              const tuning = CombinedTuningResource.from(buffer);
              console.log('Parsed as CombinedTuningResource, content length:', tuning.content.length);
              console.log('First 500 chars:', tuning.content.substring(0, 500));
              // Search for Color_
              const colorMatches = tuning.content.match(/Color_[A-Z_]+/g);
              if (colorMatches) {
                console.log('Found color tags in tuning:', colorMatches);
              }
            } catch (e) {
              // Try XmlResource
              try {
                const xml = XmlResource.from(buffer);
                console.log('Parsed as XmlResource, content length:', xml.content.length);
                console.log('First 200 chars:', xml.content.substring(0, 200));
              } catch (e2) {
                console.log('Not XmlResource or CombinedTuningResource:', e2.message);
              }
            }
          }
        } catch (e) {
          console.log('Error parsing resource:', e.message);
        }
      }
    });

    const CASP_RESOURCE_TYPE = 0x034AEECB;

    const caspEntries = s4pkg.entries.filter(
      entry => entry.key.type === CASP_RESOURCE_TYPE
    );

    console.log(`Found ${caspEntries.length} CAS Part(s) in this file.`);

    caspEntries.forEach((entry, index) => {
      console.log(`\n--- CAS Part ${index + 1} ---`);
      console.log(`Instance ID: ${entry.key.instance.toString()}`);
      console.log(`Group ID: ${entry.key.group.toString()}`);

      try {
        // Attempt to parse as CasPart
        const models = require('@s4tk/models');
        console.log('Available in models:', Object.keys(models));
        if (models.lib) console.log('lib:', Object.keys(models.lib));
        let CasPart;
        if (models.CasPart) {
          CasPart = models.CasPart;
        } else if (models.lib && models.lib.CasPart) {
          CasPart = models.lib.CasPart;
        } else {
          // Try to manually parse the decompressed buffer
          console.log('Attempting manual parsing of decompressed buffer...');
          const zlib = require('zlib');
          const compressedBuffer = entry.value.bufferCache.buffer;
          const decompressed = zlib.inflateSync(compressedBuffer);
          console.log('Decompressed size:', decompressed.length);
          console.log('Decompressed (first 100 bytes hex):', decompressed.slice(0, 100).toString('hex'));
          const nullIndex = decompressed.indexOf(0);
          console.log('Null index:', nullIndex);
          // Try UTF-16LE from offset 12
          const nameStr = decompressed.toString('utf16le', 12).split('\0')[0];
          console.log('Extracted name string:', JSON.stringify(nameStr));
          const endIndex = nullIndex > 0 ? nullIndex : Math.min(200, decompressed.length);
          const decompressedStr = decompressed.toString('utf8', 2, endIndex);
          console.log('First part of decompressed data (from offset 2 to null or 200):', JSON.stringify(decompressedStr));
          // Extract name: match the specific pattern
          const nameMatch = nameStr.match(/BANK42n_.*_COLOR_[A-Z_]+/);
          console.log('nameMatch:', nameMatch);
          if (nameMatch) {
            console.log('Extracted name:', nameMatch[0]);
          } else {
            console.log('No name found in string data.');
            // Try simpler
            const colorMatch = nameStr.match(/COLOR_[A-Z_]+/);
            if (colorMatch) {
              console.log('Found color:', colorMatch[0]);
            }
          }
          // Search for Color_ tags
          const colorMatches = nameStr.match(/Color_[A-Z_]+/g);
          if (colorMatches) {
            console.log('Found color tags:', colorMatches);
          } else {
            console.log('No color tags found in string data.');
          }
          // Also check for TagValue
          const tagMatches = decompressedStr.match(/"TagValue":"([^"]*)"/g);
          if (tagMatches) {
            console.log('Found TagValue entries:', tagMatches.slice(0, 10)); // First 10
          }
          throw new Error('Manual parsing attempted, but CasPart not available');
        }
        const casPart = CasPart.from(entry.value);

        console.log('CasPart parsed successfully!');
        console.log('Properties:');

        // Log all properties
        for (const prop in casPart) {
          if (casPart.hasOwnProperty(prop)) {
            const value = casPart[prop];
            if (typeof value === 'object' && value !== null) {
              console.log(`  ${prop}: [Object]`);
              // Log nested properties if it's a simple object
              if (Array.isArray(value)) {
                console.log(`    Array with ${value.length} items`);
              } else {
                for (const subProp in value) {
                  if (value.hasOwnProperty(subProp)) {
                    console.log(`    ${subProp}: ${value[subProp]}`);
                  }
                }
              }
            } else {
              console.log(`  ${prop}: ${value}`);
            }
          }
        }

        // Specifically look for color-related properties
        if (casPart.colorTag !== undefined) {
          console.log(`\nColor Tag: ${casPart.colorTag}`);
        }
        if (casPart.color !== undefined) {
          console.log(`Color: ${casPart.color}`);
        }
        if (casPart.subtype !== undefined) {
          console.log(`Subtype: ${casPart.subtype}`);
        }

      } catch (e) {
        console.error(`Failed to parse CasPart: ${e.message}`);
        console.log('entry.value type:', typeof entry.value);
        if (Buffer.isBuffer(entry.value)) {
          console.log('Raw buffer (first 50 bytes):', entry.value.slice(0, 50).toString('hex'));
        } else {
          console.log('entry.value:', entry.value);
        }
      }
    });

  } catch (e) {
    console.error(`Error processing package: ${e.message}`);
  }
}

main();