import {
  readdir, // leitura de diretórios
  readFile, // leitura de arquivos => buffer
  rename as renameSync, // renomear docs
  appendFile, //logs
} from "fs/promises"; // async

import * as ft from "file-type";

import XLSX from "xlsx";

/**
 * @async
 * @function logs
 * @description CREATE CUSTOM LOGS (WITH ARCHIVES FOR SAVE THE LOGS)
 * @param {string} nameArchive - Name of the log archive file.
 * @param {string} msg - Log message to be appended to the archive.
 * @example await logs('customLogs.txt', 'Custom log message...');
 */
export const logs = async (nameArchive, msg) => {
  try {
    await appendFile(`./src/logs/${nameArchive}`, `${msg}\n`);
  } catch (error) {}
};

/**
 * @function readSheet
 * @description READ SHEET AND RETURN STRUCTURED DATA
 * @param {string} sheetPath - Path to the Excel sheet file to be read.
 * @param {number} columnMax - Maximum column index to read data from (starting from 0).
 * @param {number} rowMax - Maximum row index to read data from (starting from 1).
 * @param {number} sheetPage - Index of the sheet page to read (starting from 0).
 * @returns {Array<Object>} - An array of objects representing the structured data from the Excel sheet.
 * @throws {Error} - Throws an error if there is an issue reading the sheet.
 * @example const structuredData = readSheet('./path/to/excel-sheet.xlsx', 15, 100, 0);
 */
export const readSheet = (sheetPath, columnMax, rowMax, sheetPage) => {
  try {
    const workbook = XLSX.readFile(sheetPath);
    const sheetName = workbook.SheetNames[sheetPage];
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    const resultArray = [];
    for (let row = 0 + 1; row <= rowMax; row++) {
      const rowObject = {};

      for (let col = 0; col <= columnMax; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        const columnName = worksheet[cellAddress]?.w.toLowerCase();
        const cellValue =
          worksheet[XLSX.utils.encode_cell({ r: row, c: col })]?.w;

        rowObject[columnName] = cellValue || "";
      }
      resultArray.push(rowObject);
    }
    return resultArray;
  } catch (error) {
    throw new Error("Erro ao ler a planilha: " + error);
  }
};

/**
 * @async
 * @function paginateArray
 * @description PAGINATE ARRAY FUNCTION
 * @param {Array} array - The array to be divided into chunks.
 * @param {number} size - The size of each chunk.
 * @returns {Array} - An array containing subarrays (chunks) of the original array.
 * @example const dividedArray = paginateArray(['item1', 'item2', 'item3', 'item4'], 2);
 */
export const paginateArray = (array, size) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

/**
 * @async
 * @function addExtensionToArchive
 * @description ADD EXTENSION ON ARCHIVES USING FT FOR DISCOVER EXTENSION AT DOCUMENT
 * @param {array} data
 * @param {string} mainDirectory
 * @param {string} directory
 * @param {number} batchSize page size (for array pagination )
 * @param {number} limit limit of process archives
 * @const (data) {pasta: clientes, files: ['arquivo1.pdf','arquivo2.docx']}
 * @example addExtensionToArchive(data, 'Files', 'clientes', 500, 10000)
 *
 */
export const addExtensionToArchive = async (
  data,
  mainDirectory,
  directory,
  batchSize,
  limit
) => {
  const queue = [];

  // Ordenar as pastas numericamente
  const sortedData = [...data].sort(
    (a, b) => parseInt(a.pasta) - parseInt(b.pasta)
  );

  for (const item of sortedData) {
    const sortedFiles = [...item.arquivos].sort(); // Ordenar arquivos

    for (const arq of sortedFiles) {
      const path = `./src/${mainDirectory}/${directory}/${item.pasta}/${arq}`;
      queue.push({ path, arq });
    }
  }

  queue.sort((a, b) => {
    const folderA = a.path.split("/").slice(-2)[0];
    const folderB = b.path.split("/").slice(-2)[0];
    return parseInt(folderA) - parseInt(folderB);
  });

  let processedCount = 0;

  while (queue.length > 0 && processedCount < limit) {
    const batch = queue.splice(0, batchSize);
    await Promise.all(
      batch.map(async ({ path, arq }) => {
        try {
          const dataFile = await detectFileType(path, arq);

          if (dataFile && dataFile.ext) {
            renameSync(`${path}`, `${path}.${dataFile.ext}`);
            processedCount++;
            console.log(`Processed ${processedCount} files`);
          } else {
            console.error(
              `Error processing file: ${arq}. File type not detected.`
            );
          }
        } catch (error) {
          console.error(`Error processing file: ${arq}.`, error);
        }
      })
    );
  }
};

/**
 * @async
 * @function removeExtesion
 * @description REMOVE EXTENSION FOR ARCHIVES
 * @param {array} data
 * @param {string} mainDirectory
 * @param {string} directory
 * @param {array} extensionsToRemove array with extensions to remove ['docx', 'pdf'...]
 * @const (data) {pasta: clientes, files: ['arquivo1.pdf','arquivo2.docx']}
 * @const (extensions) ['docx', 'pdf','zip', 'rar', 'odt']
 * @example removeExtesion(data, 'Files', 'clientes', extensions)
 */
export const removeExtesion = async (
  data,
  mainDirectory,
  directory,
  extensionsToRemove
) => {
  try {
    for (const item of data) {
      for (const arq of item.arquivos) {
        let path = `./src/${mainDirectory}/${directory}/${item.pasta}/${arq}`;

        // REMOVE EXTESION FOR EACH ARCHIVE READ
        for (const ext of extensionsToRemove) {
          const newPath = `${path}`.replace(`.${ext}`, "");
          await renameSync(path, newPath);
          path = newPath;
        }

        console.log(path);
      }
    }
  } catch (error) {
    console.error("Error removing extensions:", error);
    throw error;
  }
};

/**
 * @async
 * @function detectFileType
 * @description DETECT FILE TYPE (EXTENSION OF ARCHIVE)
 * @param {string} path - Full path of archive (content document name)
 * @param {string} arq - archive name
 * @example  detectFileType('./src/Files/clientes/123/arquivo1.pdf', 'arquivo1.pdf');
 * @returns {Object} { ext: "pdf", mime: "application/pdf" };
 */
export const detectFileType = async (path, arq) => {
  try {
    const buffer = await readFile(path);
    const fileType = await ft.fileTypeFromBuffer(buffer);
    // import * as ft from "file-type"
    const doc = buffer.toString();
    if (doc.length === 0) {
      const emptyDoc = `path: ${path}\nArchive: ${arq}\nThe document is Empty!\n\n`;
    }

    if (fileType) {
      console.log("\n", arq, fileType);
      return fileType;
    }

    if (buffer.toString("utf8").includes("%PDF")) {
      const msg = `path: ${path}\nArchive: ${arq}\nMessage: The document is pdf but contains white spaces at the first line document\n\n`;
      console.log(path);
      logs("cleanArchives.txt", msg);

      return { ext: "pdf", mime: "application/pdf" };
    } else {
    }
  } catch (error) {
    console.error(`Error processing file: ${arq}.`, error);
  }
};
/**
 * @async
 * @function addExtensionToNotes
 * @description ADD EXTENSION ON LOG ARCHIVE
 * @param {array} data
 * @param {string} mainDirectory
 * @param {string} directory
 * @param {number} batchSize
 * @param {number} limit
 * @const (data) {pasta: clientes, files: ['arquivo1.pdf','arquivo2.docx']}
 * @example addExtensionToNotes(data, 'Logs', 'archive', 500, 10000)
 */
export const addExtensionToNotes = async (
  data,
  mainDirectory,
  directory,
  batchSize,
  limit
) => {
  const queue = [];

  const sortedData = [...data].sort(
    (a, b) => parseInt(a.pasta) - parseInt(b.pasta)
  );

  for (const item of sortedData) {
    const sortedFiles = [...item.arquivos].sort(); // Ordenar arquivos

    for (const arq of sortedFiles) {
      const path = `./src/${mainDirectory}/${directory}/${item.pasta}/${arq}`;
      queue.push({ path, arq });
    }
  }

  queue.sort((a, b) => {
    const folderA = a.path.split("/").slice(-2)[0];
    const folderB = b.path.split("/").slice(-2)[0];
    return parseInt(folderA) - parseInt(folderB);
  });

  let processedCount = 0;

  while (queue.length > 0 && processedCount < limit) {
    const batch = queue.splice(0, batchSize);
    await Promise.all(
      batch.map(async ({ path, arq }) => {
        try {
          const dataFile = await detectFileType(path, arq);
          if (dataFile && dataFile.ext) {
            await appendFile(
              "./src/logs/notes.txt",
              `archive: ${arq}, ext: ${dataFile.ext}\n`
            );
            processedCount++;
            console.log(`Processed ${processedCount} files`);
          } else {
            console.error(
              `Error processing file: ${arq}. File type not detected.`
            );
          }
        } catch (error) {
          console.error(`Error processing file: ${arq}.`, error);
        }
      })
    );
  }
};

/**
 *
 * @description SET ATTRIBUTE OBJECT TO UPDATE METADATA DOCUMENT AT CLM
 * @param {Object} sheetRow - An object representing a row of data from an Excel sheet.
 * @returns {Object} - An object containing attributes for updating metadata on a document in CLM.
 * @example const attributes = setAttributesAtDocument({ contratante: 'CompanyA', contratada: 'CompanyB', 'tipo do contrato': 'TypeA', objeto: 'ObjectA', 'data de assinatura': '2022-01-01', 'término da vigência': '2023-01-01', 'renovação': 'Yes', 'rescisão': 'No', status: 'Active' });
 */
export const setAttributesAtDocument = async (sheetRow) => {
  return {
    AttributeGroups: {
      "Athon Atributos de teste": {
        "Razão Social": {
          Value: sheetRow?.["razão social"] || "",
        },
        CNPJ: {
          Value: sheetRow?.cnpj || "",
        },
        "Data de assinatura": {
          Value: sheetRow?.["data de assinatura"] || "",
        },
        "Data final do contrato": {
          Value: sheetRow?.["data final do contrato"] || "",
        },
        Observações: {
          Value: sheetRow?.["observações"] || "",
        },
        Telefone: {
          Value: sheetRow?.["telefone"] || "",
        },
        "Tipo de contrato": {
          Value: sheetRow?.["tipo de contrato"] || "",
        },
      },
    },
  };
};

/**
 * @async
 * @function readFiles
 * @description READ ARCHIVES TO RETURN OBJECT ARRAY CONTENT FOLDER STRUTCTURE
 * @param {string} mainDirectory
 * @param {string} directory
 * @example readFiles('Files', "clientes")
 * @returns {object} return {pasta: subs, arquivos: files,};
 * @example {pasta: clientes, files: ['arquivo1.pdf','arquivo2.docx']}
 */
export const readFiles = async (mainDirectory, directory) => {
  try {
    const subDirectorys = await readdir(
      `./src/${mainDirectory}/${directory}`,
      "utf8"
    );
    subDirectorys.sort((a, b) => parseInt(a) - parseInt(b));

    const archives = await Promise.all(
      subDirectorys.map(async (subs) => {
        const path = `./src/${mainDirectory}/${directory}/${subs}/`;
        const files = await readdir(path, "utf8");

        return {
          pasta: subs,
          arquivos: files,
        };
      })
    );

    return archives;
  } catch (err) {
    logs("readArchive.txt", `Erro ao ler o diretório ==readFiles()==`);
    console.error(err);
    throw err;
  }
};

/**
 *
 * @function createSheetWithPaths
 * @description CREATE OR ADD ON THE SHEET COLUMN AND VALUES WITH DOCUMENTS RELATIVE PATHS
 * @param {string} dataDocument
 * @param {string} namePage
 * @param {string} existingSheet
 * @example createSheetWithPaths('dataDocument','documentorequisicao','sheetExistingPath.xlsx')
 */
export const createSheetWithPaths = (
  dataDocument,
  namePage,
  existingSheet = false
) => {
  const sheetData = [["Pasta", "SubPasta", "arquivo"]];

  for (const { pasta, arquivos } of dataDocument) {
    for (const arquivo of arquivos) {
      sheetData.push([namePage, pasta, arquivo]);
    }
  }

  const workbook = existingSheet
    ? XLSX.readFile(existingSheet)
    : XLSX.utils.book_new();

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  XLSX.utils.book_append_sheet(workbook, worksheet, namePage);

  const filename = existingSheet ? existingSheet : "sheet.xlsx";

  XLSX.writeFile(workbook, filename);
};
