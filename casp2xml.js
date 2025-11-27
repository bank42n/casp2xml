#!/usr/bin/env node
//
// Description:
// This script reads all Sims 4 .package files from an 'input' directory,
// extracts the instance keys of all CAS Part (CASP) resources, and
// generates a single, dynamically named XML snippet tuning file in the
// 'output' directory. The XML structure is determined by keywords
// in the package filename, but can be overridden for all parts with an argument.
// If a type cannot be determined, the script will abort.
//
// Author: BANK42n
// Version: 2.5.1
//

// Import necessary Node.js modules
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

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
    default: 'YourCreatorName'
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
  .option('parttype', {
      alias: 'p',
      description: 'Override filename detection and set a specific CAS part type for ALL parts.',
      type: 'string',
      choices: ['PENIS_HARD_MALE', 'PENIS_SOFT_MALE', 'BODY_TOP_MALE', 'BODY_BOTTOM_MALE', 'PUBIC_HAIR_MALE', 'PUBIC_HAIR_FEMALE']
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
  .example('node $0 -p "PENIS_SOFT_MALE"', 'Force all parts to be PENIS_SOFT_MALE type.')
  .help()
  .alias('help', 'h')
  .argv;


// --- CONFIGURATION ---

// Get configuration from command-line arguments
const CREATOR_NAME = argv.creator;
const CAS_PART_ICON = `00B2D882:00000000:${argv.icon.toUpperCase().padStart(16, '0')}`;
const INPUT_DIR = path.resolve(process.cwd(), argv.input);
const OUTPUT_DIR = path.resolve(process.cwd(), argv.output);

// Pubic hair constants
const PUBIC_HAIR_LENGTHS = ['short', 'medium', 'long'];
const PUBIC_HAIR_COLORS = ['BLACK', 'BLONDE', 'BROWN', 'LIGHT_BROWN', 'DARK_BROWN', 'AUBURN', 'RED', 'GRAY', 'WHITE', 'DIRTY_BLONDE', 'ORANGE'];


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
    // Remove "by <creatorName>" from anywhere in the string (not just the end), case-insensitive
    const creatorPattern = new RegExp(`\\s*by\\s*${creatorName}\\s*`, 'i');
    return base.replace(creatorPattern, '').trim().replace(/_/g, ' ');
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
  if (argv.subtype) console.log(`Subtype Override: '${argv.subtype}'`);
  if (argv.parttype) console.log(`Part Type Override: '${argv.parttype}'`);
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
  
  // Check if this is pubic hair processing
  const isPubicHair = INPUT_DIR.toLowerCase().includes('pubic_hair') || packageFiles.some(f => f.toLowerCase().includes('pubic'));
  console.log(`Pubic hair mode: ${isPubicHair ? 'Enabled' : 'Disabled'}`);
  
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
  const casPartsData = new Map(); // Use a Map to store {filename -> array of ids}

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
        const parts = [];
        caspEntries.forEach(entry => {
          const id = entry.key.instance.toString();
          // Extract name from decompressed buffer
          try {
            const compressedBuffer = entry.value.bufferCache.buffer;
            const decompressed = zlib.inflateSync(compressedBuffer);
            // Name is in UTF-16LE starting at offset 12
            const name = decompressed.toString('utf16le', 12).split('\0')[0];
            parts.push({id, name});
          } catch (e) {
            console.error(`Failed to extract name for CASP ${id}: ${e.message}`);
            parts.push({id, name: 'UNKNOWN'});
          }
        });
        casPartsData.set(filename, parts);
      } else {
        console.log("No CAS Parts found in this file.");
      }

    } catch (e) {
      console.error(`Could not process file ${filename}. Is it a valid .package file?`, e);
      console.error(e);
    }
  });

  // 5. Generate the XML snippet if any CAS parts were found
  let totalIds = 0;
  casPartsData.forEach(parts => totalIds += parts.length);
  if (totalIds === 0) {
    console.log("\nNo CAS Parts were found in any of the files. Exiting.");
    return;
  }

  console.log(`\nTotal unique CAS Part instances found: ${totalIds}`);

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
  let casPartsListXml = '';
  if (isPubicHair) {
    // Process pubic hair grouping
    const styleGroups = new Map(); // style -> color -> {short: id, medium: id, long: id}

    casPartsData.forEach((parts, filename) => {
      const base = path.basename(filename, '.package');
      const creatorPattern = new RegExp(`\\s*by\\s*${CREATOR_NAME}\\s*`, 'i');
      const withoutCreator = base.replace(creatorPattern, '').trim();
      // Find and remove length
      let style = withoutCreator;
      let lengthIndex = -1;
      PUBIC_HAIR_LENGTHS.forEach((len, idx) => {
        const lenPattern = new RegExp(`\\b${len}\\b`, 'i');
        if (lenPattern.test(style)) {
          style = style.replace(lenPattern, '').trim();
          lengthIndex = idx;
        }
      });
      if (lengthIndex === -1) {
        console.error(`Could not determine length for ${filename}. Skipping.`);
        return;
      }
      if (!styleGroups.has(style)) {
        styleGroups.set(style, new Map());
      }
      const colorMap = styleGroups.get(style);
      parts.forEach(({id, name}, idx) => {
        // Extract color from name using regex _COLOR_[color] or _[color]_ followed by non-letter or end
        const colorMatch = name.match(/.*_(?:COLOR_)?([A-Z_]+)([^A-Z]|$)/);
        let subtype = 'CUSTOM';
        let displaySuffix = '';
        if (colorMatch) {
          const foundColor = colorMatch[1];
          if (PUBIC_HAIR_COLORS.includes(foundColor)) {
            subtype = foundColor;
            const beautifiedColor = foundColor.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
            displaySuffix = ` ${beautifiedColor}`;
            } else {
            subtype = 'CUSTOM';
            const beautifiedColor = foundColor.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
            displaySuffix = ` ${beautifiedColor}`;
          }
        }
        if (!colorMap.has(subtype)) {
          colorMap.set(subtype, {short: null, medium: null, long: null, displaySuffix});
        }
        const lengthObj = colorMap.get(subtype);
        lengthObj[PUBIC_HAIR_LENGTHS[lengthIndex]] = id;
        lengthObj.displaySuffix = displaySuffix; // ensure it's set
      });
    });

    // Now, generate XML
    styleGroups.forEach((colorMap, style) => {
      colorMap.forEach((lengthsData, subtype) => {
        const shortId = lengthsData.short;
        const mediumId = lengthsData.medium;
        const longId = lengthsData.long;
        if (!shortId || !mediumId || !longId) {
          console.error(`Missing length data for style ${style} subtype ${subtype}`);
          return;
        }
        const ids = [shortId, mediumId, longId].join(',');
        const displayName = `${style}${lengthsData.displaySuffix}`;
        let partType = argv.parttype;
        if (!partType) {
          // Detect male/female from filename or default to male
          const hasMale = packageFiles.some(f => f.toLowerCase().includes('male'));
          const hasFemale = packageFiles.some(f => f.toLowerCase().includes('female'));
          partType = hasFemale && !hasMale ? 'PUBIC_HAIR_FEMALE' : 'PUBIC_HAIR_MALE';
        }
        casPartsListXml += `
    <!-- Color Tag: ${subtype} (${lengthsData.displaySuffix.trim()}) - From CASP Name -->
    <U>
      <T n="cas_part_raw_display_name">${displayName}</T>
      <T n="cas_part_author">${CREATOR_NAME}</T>
      <T n="cas_part_display_icon">${CAS_PART_ICON}</T>
      <T n="cas_part_type">${partType}</T>
      <T n="cas_part_subtype">${subtype}</T>
      <T n="cas_part_group">${style}</T>
      <T n="cas_part_ids">${ids}</T>
      <T n="has_strict_visibility">True</T>
    </U>`;
      });
    });
  } else {
    // Original logic for non-pubic hair
    const casPartsDataFlat = new Map();
    casPartsData.forEach((ids, filename) => {
      ids.forEach(id => casPartsDataFlat.set(id, filename));
    });

    const unresolvedParts = []; // Array to hold parts that cannot be resolved.
    casPartsListXml = Array.from(casPartsDataFlat.entries()).map(([id, filename]) => {
      const displayName = cleanDisplayName(filename, CREATOR_NAME);
      
      let subtypeTag = '';
      const detectedSubtype = argv.subtype || detectSubtype(filename);
      if (detectedSubtype) {
          subtypeTag = `
      <T n="cas_part_subtype">${detectedSubtype}</T>`;
      }

      // Priority 1: Use --parttype argument if provided.
      if (argv.parttype) {
        const partType = argv.parttype;
        if (partType === 'PENIS_HARD_MALE') {
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
        } else if (partType === 'PENIS_SOFT_MALE') {
          return `
    <U>
      <T n="cas_part_raw_display_name">${displayName}</T>
      <T n="cas_part_author">${CREATOR_NAME}</T>
      <T n="cas_part_display_icon">${CAS_PART_ICON}</T>
      <T n="cas_part_type">PENIS_SOFT_MALE</T>
      <T n="cas_part_id">${id}</T>${subtypeTag}
    </U>`;
        } else if (partType === 'BODY_TOP_MALE') {
          return `
    <U>
      <T n="cas_part_raw_display_name">${displayName}</T>
      <T n="cas_part_author">${CREATOR_NAME}</T>
      <T n="cas_part_display_icon">${CAS_PART_ICON}</T>
      <T n="cas_part_type">BODY_TOP_MALE</T>
      <T n="cas_part_id">${id}</T>${subtypeTag}
    </U>`;
        } else if (partType === 'BODY_BOTTOM_MALE') {
          return `
    <U>
      <T n="cas_part_raw_display_name">${displayName}</T>
      <T n="cas_part_author">${CREATOR_NAME}</T>
      <T n="cas_part_display_icon">${CAS_PART_ICON}</T>
      <T n="cas_part_type">BODY_BOTTOM_MALE</T>
      <T n="cas_part_id">${id}</T>${subtypeTag}
    </U>`;
        } else if (partType === 'PUBIC_HAIR_MALE') {
          return `
    <U>
      <T n="cas_part_raw_display_name">${displayName}</T>
      <T n="cas_part_author">${CREATOR_NAME}</T>
      <T n="cas_part_display_icon">${CAS_PART_ICON}</T>
      <T n="cas_part_type">PUBIC_HAIR_MALE</T>
      <T n="cas_part_id">${id}</T>${subtypeTag}
      <T n="has_strict_visibility">True</T>
    </U>`;
        } else if (partType === 'PUBIC_HAIR_FEMALE') {
          return `
    <U>
      <T n="cas_part_raw_display_name">${displayName}</T>
      <T n="cas_part_author">${CREATOR_NAME}</T>
      <T n="cas_part_display_icon">${CAS_PART_ICON}</T>
      <T n="cas_part_type">PUBIC_HAIR_FEMALE</T>
      <T n="cas_part_id">${id}</T>${subtypeTag}
      <T n="has_strict_visibility">True</T>
    </U>`;
        }
      }

      // Priority 2: Fallback to filename detection if --parttype is not used.
      const lowerCaseFilename = filename.toLowerCase();
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
      } else if (lowerCaseFilename.includes('semi')) {
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
      <T n="cas_part_id">${id}</T>${subtypeTag}
    </U>`;
    } else if (lowerCaseFilename.includes('bottom')) {
      return `
    <U>
      <T n="cas_part_raw_display_name">${displayName}</T>
      <T n="cas_part_author">${CREATOR_NAME}</T>
      <T n="cas_part_display_icon">${CAS_PART_ICON}</T>
      <T n="cas_part_type">BODY_BOTTOM_MALE</T>
      <T n="cas_part_id">${id}</T>${subtypeTag}
    </U>`;
    } else if (lowerCaseFilename.includes('pubic')) {
      const isFemale = lowerCaseFilename.includes('female');
      const partType = isFemale ? 'PUBIC_HAIR_FEMALE' : 'PUBIC_HAIR_MALE';
      return `
    <U>
      <T n="cas_part_raw_display_name">${displayName}</T>
      <T n="cas_part_author">${CREATOR_NAME}</T>
      <T n="cas_part_display_icon">${CAS_PART_ICON}</T>
      <T n="cas_part_type">${partType}</T>
      <T n="cas_part_id">${id}</T>${subtypeTag}
      <T n="has_strict_visibility">True</T>
    </U>`;
    } else {
        // If no type is found, add to unresolved list and return null
        unresolvedParts.push(filename);
        return null;
      }
    }).filter(part => part !== null).join(''); // Filter out nulls before joining

    // 8. VALIDATION STEP: Check if there were any unresolved parts. If so, report and exit.
    if (unresolvedParts.length > 0) {
      console.error('\n====================[ ATTENTION REQUIRED ]====================');
      console.error(`\n❌ ERROR: Could not determine CAS Part Type for ${unresolvedParts.length} file(s).`);
      console.error('Please rename the file(s) to include a supported keyword (erect, soft, top, bottom, pubic),');
      console.error('or use the --parttype argument to force a type for all parts.');
      console.error('\nProblematic file(s):');
      unresolvedParts.forEach(file => console.error(`  - ${file}`));
      console.error('\nXML file was NOT created due to the errors above.');
      console.error('==============================================================');
      return; // Abort without writing the file
    }
  }

  // 9. Assemble the final XML content
  const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<I c="WickedWhimsCASPartsPackage" i="snippet" m="wickedwhims.main.cas_parts.cas_parts_tuning" n="${tuningName}" s="${tuningIdDecimal}">
  <T n="wickedwhims_cas_parts">1</T>
  <L n="cas_parts_list">${casPartsListXml}
  </L>
</I>
`;

  // 10. Write the final XML file
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
