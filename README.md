# CASP to XML Tool (casp2xml)

**casp2xml** is a command-line tool that facilitates the creation of XML snippet tuning files for WickedWhims by extracting CAS Part (CASP) data from The Sims 4 `.package` files.

This script reads all `.package` files from a specified directory, extracts the instance IDs of all CASPs, and generates a single XML tuning file. The filename and the XML structure are customized based on keywords found in the `.package` filenames, allowing it to automatically handle different CAS Part types such as 'soft', 'erect', 'top', 'bottom', and more.

## ✨ Features

  * **Batch Processing**: Process multiple `.package` files at once.
  * **Automatic XML Generation**: Creates a complete Snippet Tuning XML file with the correct TGI (Type, Group, Instance).
  * **Dynamic Naming**: The Tuning file name and Tuning ID are automatically generated from the first `.package` file found or from a user-provided name.
  * **CAS Part Type Detection**: Detects the CAS Part type (e.g., PENIS\_HARD\_MALE, BODY\_TOP\_MALE) from keywords in the filename.
  * **Subtype Detection**: Can identify the CAS Part Subtype (e.g., HUMAN, VAMPIRE, WEREWOLF) from the filename, or it can be manually overridden by the user.
  * **Highly Customizable**: Easily customize the Creator Name, Icon, and directories via command-line arguments.
  * **Error Handling**: Provides notifications if no `.package` files are found or if an error occurs while processing a file.

## ⚙️ Installation

You must have [Node.js](https://nodejs.org/) (version 12 or higher is recommended) installed on your machine.

You can install `casp2xml` globally via npm:

```bash
npm install -g .
```


## 🚀 Usage

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

4.  **Specify Everything**:

    ```bash
    casp2xml --creator "MyCreatorName" --basename "MyAwesomeCCSet" --icon "1234567890ABCDEF" --input "C:/Users/You/Documents/MyMods" --output "C:/Users/You/Documents/GeneratedTuning"
    ```

-----

## 🔧 Options

You can view all available options by using the `casp2xml --help` command.

| Option | Alias | Description | Default |
| :--- | :---: | :--- | :--- |
| `--creator` | `-c` | Your creator name. | `CreatorName` |
| `--basename` | `-b` | The base name for the snippet collection. If unset, it's generated from the first package file. | (Generated) |
| `--icon` | `-i` | The instance key (hex) for the CAS Part display icon. Icon must be DDS BC1 without mipmap at resolution of 100 x 100 px | `0000000000000000` |
| `--parttype` | `-p` | Override automatic detection and set a specific CAS part type (Supported is `PENIS_HARD_MALE', 'PENIS_SOFT_MALE', 'BODY_TOP_MALE', 'BODY_BOTTOM_MALE`). | (Auto-detected) |
| `--subtype` | `-s` | Override automatic detection and set a specific CAS part subtype (e.g., `HUMAN`, `VAMPIRE`, `WEREWOLF`). | (Auto-detected) |
| `--input` | `-in` | The directory containing your `.package` files. | `.` (current directory) |
| `--output` | `-out` | The directory where the generated XML file will be saved. | `.` (current directory) |
| `--help` | `-h` | Show the help screen. | |

-----

## 🤝 Contributing

If you encounter any issues or have suggestions, please open an Issue on the GitHub repository.

## 📝 License

This project is licensed under the MIT License.
