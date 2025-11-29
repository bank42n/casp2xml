# CASP to XML Tool (casp2xml)

**casp2xml** is a command-line tool that facilitates the creation of XML snippet tuning files for [WickedWhims](https://wickedwhimsmod.com/) by TURBODRIVER, by extracting CAS Part (CASP) data from The Sims 4 `.package` files.

## About

This tool was created by [BANK42n](https://www.patreon.com/BANK42n) to help generate WickedWhims tuning files for **BTTB 7 (Better Body 7)** body part, pubic hair and other CAS parts. It supports pubic hair with multiple lengths (short, medium, long) and color variants that work with WickedWhims' dynamic pubic hair growth system.

Other CC creators are welcome to use this tool for their own WickedWhims custom content.

## How It Works

This script reads all `.package` files from a specified directory, extracts the instance IDs of all CASPs, and generates a single XML tuning file. The filename and the XML structure are customized based on keywords found in the `.package` filenames, allowing it to automatically handle different CAS Part types such as 'soft', 'erect', 'top', 'bottom', and pubic hair with color variants.

For pubic hair CAS parts, the script automatically extracts color information from the CASP resource names (e.g., embedded tags like `_CUSTOM_WHITE` or `_BLACK_`) to generate appropriate subtypes and display names.

## Features

  * **Batch Processing**: Process multiple `.package` files at once.
  * **Automatic XML Generation**: Creates a complete Snippet Tuning XML file with the correct TGI (Type, Group, Instance).
  * **Dynamic Naming**: The Tuning file name and Tuning ID are automatically generated from the first `.package` file found or from a user-provided name.
  * **CAS Part Type Detection**: Detects the CAS Part type (e.g., PENIS\_HARD\_MALE, BODY\_TOP\_MALE, PUBIC\_HAIR\_FEMALE) from keywords in the filename.
  * **Subtype Detection**: Can identify the CAS Part Subtype (e.g., HUMAN, VAMPIRE, WEREWOLF) from the filename, or it can be manually overridden by the user.
  * **Pubic Hair Color Detection**: For pubic hair CAS parts, automatically extracts color subtypes from CASP resource names (e.g., `_CUSTOM_WHITE` or `_BLACK_`) and groups by style, color, and length (short, medium, long).
  * **Pubic Hair Modes**: Supports **Dynamic** mode (combines short/medium/long into growth stages), **Static** mode (treats each length separately), or **Both** modes simultaneously.
  * **Highly Customizable**: Easily customize the Creator Name, Icon, and directories via command-line arguments.
  * **Error Handling**: Provides notifications if no `.package` files are found or if an error occurs while processing a file.

## Installation

You must have [Node.js](https://nodejs.org/) (version 12 or higher is recommended) installed on your machine.

You can install `casp2xml` globally via npm:

```bash
npm install -g .
```


## Usage

After installation, you can use `casp2xml` directly from the command line.

### Basic Usage Structure

```bash
casp2xml [options]
```

### Usage Examples

1.  **Run with default settings**:
    Place your `.package` files in the same folder where you run the command. The generated XML file will be created in the same folder.

    ```bash
    casp2xml
    ```

2.  **Specify a Creator Name and Subtype**:

    ```bash
    casp2xml --creator "MyCreatorName" --subtype "WEREWOLF"
    ```

3.  **Specify Input and Output Directories**:

    ```bash
    casp2xml --input "./MyCC" --output "./TuningOutput"
    ```

4.  **Generate XML for Pubic Hair with Color Detection (Dynamic Mode - Default)**:

    ```bash
    casp2xml --input "./PubicHairPackages" --creator "BANK42n" --parttype "PUBIC_HAIR_MALE"
    ```

    This will process packages named like "My Pubic Hair Long by BANK42n.package", extract colors from CASP names (e.g., `_CUSTOM_WHITE` or `_BLACK_`), and generate XML with subtypes like BLACK, BROWN, or CUSTOM for unmatched colors. 
    
    **Supported natural colors**: BLACK, BLONDE, BROWN, LIGHT_BROWN, DARK_BROWN, DIRTY_BLONDE, LIGHT_BLONDE, AUBURN, GRAY, ORANGE.
    
    **Custom colors** (subtype = CUSTOM): WHITE, PINK, BLUE, GREEN, and any color using `_CUSTOM_<COLOR>` pattern.

    In **Dynamic** mode (default), lengths (short/medium/long) are combined into growth stages with 3 CAS Part IDs per entry. Display names include "Dynamic" indicator.

5.  **Generate XML for Pubic Hair in Static Mode**:

    ```bash
    casp2xml --input "./PubicHairPackages" --creator "BANK42n" --pubic-hair-mode static
    ```

    In **Static** mode, each package file generates separate entries with the length indicator in the display name (e.g., "Gray (Long) Static"). Each entry has a single CAS Part ID.

6.  **Generate XML for Pubic Hair with Both Modes**:

    ```bash
    casp2xml --input "./PubicHairPackages" --creator "BANK42n" --parttype "PUBIC_HAIR_MALE" --pubic-hair-mode both
    ```

    This generates all entries - both Dynamic (combined lengths) and Static (individual lengths) - in a single XML file.

7.  **Specify Everything**:

    ```bash
    casp2xml --creator "MyCreatorName" --basename "MyAwesomeCCSet" --icon "1234567890ABCDEF" --input "C:/Users/You/Documents/MyMods" --output "C:/Users/You/Documents/GeneratedTuning"
    ```

-----

## Options

You can view all available options by using the `casp2xml --help` command.

| Option | Alias | Description | Default |
| :--- | :---: | :--- | :--- |
| `--creator` | `-c` | Your creator name. | `CreatorName` |
| `--basename` | `-b` | The base name for the snippet collection. If unset, it's generated from the first package file. | (Generated) |
| `--icon` | `-i` | The instance key (hex) for the CAS Part display icon. Icon must be DDS BC1 without mipmap at resolution of 100 x 100 px | `0000000000000000` |
| `--parttype` | `-p` | Override automatic detection and set a specific CAS part type (Supported: `PENIS_HARD_MALE`, `PENIS_SOFT_MALE`, `BODY_TOP_MALE`, `BODY_BOTTOM_MALE`, `PUBIC_HAIR_MALE`, `PUBIC_HAIR_FEMALE`). | (Auto-detected from file name) |
| `--subtype` | `-s` | Override automatic detection and set a specific CAS part subtype (e.g., `HUMAN`, `VAMPIRE`, `WEREWOLF`). | (Auto-detected from file name) |
| `--input` | `-in` | The directory containing your `.package` files. | `.` (current directory) |
| `--output` | `-out` | The directory where the generated XML file will be saved. | `.` (current directory) |
| `--pubic-hair-mode` | `-phm` | Pubic hair processing mode: `dynamic` (combines lengths into growth stages), `static` (treats each length separately), or `both` (generates both types). | `dynamic` |
| `--help` | `-h` | Show the help screen. | |

-----

## Contributing

If you encounter any issues or have suggestions, please open an Issue on the GitHub repository.

## Files

- `casp2xml.js`: Main script for generating XML from .package files.
- `debug_cas_part.js`: Debug script to inspect CASP resources in .package files (useful for troubleshooting color extraction).

## License

This project is licensed under the MIT License.

## Credits

- **BANK42n** - Original developer and creator of BTTB 7
- [WickedWhims](https://wickedwhimsmod.com/) by TURBODRIVER - The adult mod this tool generates tuning files for
- [@s4tk](https://sims4toolkit.com/) - Sims 4 Toolkit libraries used for package file parsing
