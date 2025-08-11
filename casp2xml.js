#!/usr/bin/env node
//
// Description:
// This script reads all Sims 4 .package files from an 'input' directory,
// extracts the instance keys of all CAS Part (CASP) resources, and
// generates a single, dynamically named XML snippet tuning file in the
// 'output' directory. The XML structure is customized based on keywords
// in the package filename. Configuration can be provided via command-line arguments.
//
// Author: BANK42n
// Version: 2.1.0
//

// Import necessary Node.js modules
const fs = require('fs');
const path = require('path');

// Import necessary modules from the Sims 4 Toolkit library
// Make sure to install them first by running:
// npm install @s4tk/models @s4tk/hashing yargs
const { Package } = require('@s4tk/models');
const { fnv64 } = require('@s4tk/hashing');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// --- ARGUMENT PARSING ---

const argv = yargs(hideBin(process.argv))
  .option('creator', {
    alias: 'c',
    description: 'Your creator name.',
    type: 'string',
    default: 'CreatorName'
  })
  .option('basename', {
    alias: 'b',
    description: 'The base name for the snippet collection. If unset, generated from the first package file.',
    type: 'string'
  })
  .option('icon', {
    alias: 'i',
    description: 'The instance key (hex) for the CAS Part display icon.',
    type: 'string',
    default: '0000000000000000'
  })
  .option('subtype', {
      alias: 's',
      description: 'Override automatic detection and set a specific CAS part subtype.',
      type: 'string',
      choices: ['HUMAN', 'ALIEN', 'VAMPIRE', 'MERMAID', 'WEREWOLF', 'FAIRY']
  })
  .option('input', {
      alias: 'in',
      description: 'The directory containing your .package files.',
      type: 'string',
      default: '.'
  })
  .option('output', {
      alias: 'out',
      description: 'The directory where the generated XML file will be saved.',
      type: 'string',
      default: '.'
  })
  .usage('Usage: node $0 [options]')
  .example('node $0', 'Run with default settings.')
  .example('node $0 -c "MyName" -s "VAMPIRE"', 'Run with custom creator and override subtype.')
  .help()
  .alias('help', 'h')
  .argv;


// --- CONFIGURATION ---

// Get configuration from command-line arguments
const CREATOR_NAME = argv.creator;
const CAS_PART_ICON = `00B2D882:00000000:${argv.icon.toUpperCase().padStart(16, '0')}`;
const INPUT_DIR = path.resolve(process.cwd(), argv.input);
const OUTPUT_DIR = path.resolve(process.cwd(), argv.output);


// --- SCRIPT LOGIC ---

/**
 * Converts a string into a "slug" suitable for file and tuning names.
 * Replaces spaces and invalid characters with underscores.
 * @param {string} text The string to slugify.
 * @returns {string} The slugified string.
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim() // Remove leading/trailing whitespace
    .replace(/[^a-z0-9\s_]+/g, '') // Remove invalid characters, keeping letters, numbers, spaces, underscores
    .replace(/\s+/g, '_') // Replace one or more spaces with a single underscore
    .replace(/__+/g, '_'); // Replace multiple underscores with a single one
}

/**
 * Cleans a filename to be used as a display name in the tuning.
 * @param {string} filename The full filename of the package.
 * @param {string} creatorName The creator name to remove from the end.
 * @returns {string} A clean display name.
 */
function cleanDisplayName(filename, creatorName) {
    const base = path.basename(filename, '.package');
    const creatorPattern = new RegExp(`\\s+by\\s+${creatorName}$`, 'i');
    return base.replace(creatorPattern, '').trim().replace(/_/g, ' ');
}

/**
 * Automatically detects the CAS part subtype from the filename.
 * @param {string} filename The filename to check.
 * @returns {string|null} The detected subtype in uppercase, or null if not found.
 */
function detectSubtype(filename) {
    const lowerCaseFilename = filename.toLowerCase();
    const subtypes = ['HUMAN', 'ALIEN', 'VAMPIRE', 'MERMAID', 'WEREWOLF', 'FAIRY'];
    for (const subtype of subtypes) {
        if (lowerCaseFilename.includes(subtype.toLowerCase())) {
            return subtype;
        }
    }
    return null;
}


/**
 * Ensures that a directory exists. If it doesn't, it's created.
 * @param {string} dirPath Path to the directory to check/create.
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`Creating directory: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * The main function that runs the script.
 */
function main() {
  console.log("Starting CAS Part extractor script...");
  console.log(`Configuration: Creator='${CREATOR_NAME}', Icon='${CAS_PART_ICON}'`);
  if (argv.subtype) {
    console.log(`Subtype Override: '${argv.subtype}'`);
  }
  console.log(`Input Directory: '${INPUT_DIR}'`);
  console.log(`Output Directory: '${OUTPUT_DIR}'`);


  // 1. Set up input and output directories
  ensureDirectoryExists(INPUT_DIR);
  ensureDirectoryExists(OUTPUT_DIR);

  // 2. Read all files from the input directory
  let files;
  try {
    files = fs.readdirSync(INPUT_DIR);
  } catch (e) {
    console.error(`Error reading input directory: ${INPUT_DIR}`, e);
    return;
  }

  const packageFiles = files.filter(file => path.extname(file).toLowerCase() === '.package');

  if (packageFiles.length === 0) {
    console.log(`No .package files found in '${INPUT_DIR}'. Please add some and run the script again.`);
    return;
  }

  console.log(`Found ${packageFiles.length} package file(s) to process.`);
  
  // 3. Determine the Snippet Base Name
  let SNIPPET_BASE_NAME;
  if (argv.basename) {
      SNIPPET_BASE_NAME = argv.basename;
      console.log(`Using provided snippet base name: "${SNIPPET_BASE_NAME}"`);
  } else {
      const firstFileName = path.basename(packageFiles[0], '.package');
      const creatorPattern = new RegExp(`\\s+by\\s+${CREATOR_NAME}$`, 'i');
      SNIPPET_BASE_NAME = firstFileName.replace(creatorPattern, '').trim();
      console.log(`Using dynamically generated snippet base name: "${SNIPPET_BASE_NAME}"`);
  }

  // 4. Extract CAS Part data from all package files
  const casPartsData = new Map(); // Use a Map to store {id -> filename}

  packageFiles.forEach(filename => {
    const filepath = path.join(INPUT_DIR, filename);
    console.log(`\n--- Processing: ${filename} ---`);
    try {
      const buffer = fs.readFileSync(filepath);
      const s4pkg = Package.from(buffer);
      
      const CASP_RESOURCE_TYPE = 0x034AEECB;
      
      const caspEntries = s4pkg.entries.filter(
        entry => entry.key.type === CASP_RESOURCE_TYPE
      );

      if (caspEntries.length > 0) {
        console.log(`Found ${caspEntries.length} CAS Part(s) in this file.`);
        caspEntries.forEach(entry => {
          const instanceId = entry.key.instance.toString();
          casPartsData.set(instanceId, filename);
          console.log(`  > Extracted Instance ID: ${instanceId}`);
        });
      } else {
        console.log("No CAS Parts found in this file.");
      }

    } catch (e) {
      console.error(`Could not process file ${filename}. Is it a valid .package file?`, e);
      console.error(e);
    }
  });

  // 5. Generate the XML snippet if any CAS parts were found
  if (casPartsData.size === 0) {
    console.log("\nNo CAS Parts were found in any of the files. Exiting.");
    return;
  }

  console.log(`\nTotal unique CAS Part instances found: ${casPartsData.size}`);

  // 6. Generate dynamic tuning name, ID, and filename
  const slugifiedBaseName = slugify(SNIPPET_BASE_NAME);
  const tuningName = `${CREATOR_NAME}:${slugifiedBaseName}`;
  
  const tuningIdBigInt = fnv64(tuningName);
  const tuningIdDecimal = tuningIdBigInt.toString();
  const tuningIdHex = tuningIdBigInt.toString(16).toUpperCase().padStart(16, '0');

  const TYPE_ID_HEX = '7DF2169C';
  const GROUP_ID_HEX = '00000000';

  const dynamicFilename = `${TYPE_ID_HEX}!${GROUP_ID_HEX}!${tuningIdHex}.${CREATOR_NAME}_${slugifiedBaseName}.SnippetTuning.xml`;
  
  // 7. Create the list of CAS parts for the XML
  const casPartsListXml = Array.from(casPartsData.entries()).map(([id, filename]) => {
    const lowerCaseFilename = filename.toLowerCase();
    const displayName = cleanDisplayName(filename, CREATOR_NAME);
    
    // Determine the subtype tag
    let subtypeTag = '';
    const detectedSubtype = argv.subtype || detectSubtype(filename);
    if (detectedSubtype) {
        subtypeTag = `
      <T n="cas_part_subtype">${detectedSubtype}</T>`;
    }


    if (lowerCaseFilename.includes('erect')) {
      return `
    <U>
      <T n="cas_part_raw_display_name">${displayName}</T>
      <T n="cas_part_author">${CREATOR_NAME}</T>
      <T n="cas_part_display_icon">${CAS_PART_ICON}</T>
      <T n="cas_part_type">PENIS_HARD_MALE</T>
      <T n="cas_part_id">${id}</T>${subtypeTag}
      <U n="penis_sliders">
        <T n="length_slider_low">0</T>
        <T n="length_slider_high">0</T>
        <T n="girth_slider_low">0</T>
        <T n="girth_slider_high">0</T>
      </U>
    </U>`;
    } else if (lowerCaseFilename.includes('soft')) {
      return `
    <U>
      <T n="cas_part_raw_display_name">${displayName}</T>
      <T n="cas_part_author">${CREATOR_NAME}</T>
      <T n="cas_part_display_icon">${CAS_PART_ICON}</T>
      <T n="cas_part_type">PENIS_SOFT_MALE</T>
      <T n="cas_part_id">${id}</T>${subtypeTag}
    </U>`;
    } else if (lowerCaseFilename.includes('top')) {
      return `
    <U>
      <T n="cas_part_raw_display_name">${displayName}</T>
      <T n="cas_part_author">${CREATOR_NAME}</T>
      <T n="cas_part_display_icon">${CAS_PART_ICON}</T>
      <T n="cas_part_type">BODY_TOP_MALE</T>
      <T n="cas_part_id">${id}</T>
    </U>`;
    } else if (lowerCaseFilename.includes('bottom')) {
      return `
    <U>
      <T n="cas_part_raw_display_name">${displayName}</T>
      <T n="cas_part_author">${CREATOR_NAME}</T>
      <T n="cas_part_display_icon">${CAS_PART_ICON}</T>
      <T n="cas_part_type">BODY_BOTTOM_MALE</T>
      <T n="cas_part_id">${id}</T>
    </U>`;
    } else {
      return `
    <U>
      <T n="cas_part_id">${id}</T>
      <!-- 
        NOTE: Could not determine type from filename. Please fill in the details manually.
        Filename: ${filename}
      -->
    </U>`;
    }
  }).join('');

  // 8. Assemble the final XML content
  const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<I c="WickedWhimsCASPartsPackage" i="snippet" m="wickedwhims.main.cas_parts.cas_parts_tuning" n="${tuningName}" s="${tuningIdDecimal}">
  <T n="wickedwhims_cas_parts">1</T>
  <L n="cas_parts_list">${casPartsListXml}
  </L>
</I>
`;

  // 9. Write the final XML file
  const outputFilePath = path.join(OUTPUT_DIR, dynamicFilename);
  try {
    fs.writeFileSync(outputFilePath, xmlContent);
    console.log(`\n✅ Success! Snippet tuning file created at: ${outputFilePath}`);
  } catch (e) {
    console.error(`Error writing output file to ${outputFilePath}`, e);
  }
}

// Run the script
main();
