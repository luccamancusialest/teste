import { readFile } from "fs/promises";
import { logs } from "../utils/index.js";

/**
 * @async
 * @function matchFolders
 * @description SEARCH FOLDERS AT LOCAL DIRECTORY WITH SHEET VALUES
 * @param {Array<Object>} array - An array of objects representing data from an Excel sheet.
 * @param {string} nameFolder - Name of the folder to search for in the local directory.
 * @returns {Promise<void>} - Resolves after searching and logging folder information.
 * @example await matchFolders([{ contratada: 'CompanyA', contratante: 'CompanyB', doc: 'Document123' }], 'Contracts');
 */
export const matchFolders = async (array, nameFolder) => {
  const logsArray = [];
  let docs = [];
  await Promise.all(
    array.map(async (row, i) => {
      const contratada = await formatStr(row.contratada);
      const contratante = await formatStr(row.contratante);
      const doc = row.doc;
      // console.log(doc);

      const path = `./src/Surf/${contratada}/${nameFolder}/${contratante}/`;
      const pathDois = `./src/Surf/${contratante}/${nameFolder}/${contratada}/`;
      const filePath = `./src/Surf/${contratada}/${nameFolder}/${contratante}/${doc}.pdf`;
      const filePathDois = `./src/Surf/${contratante}/${nameFolder}/${contratada}/${doc}.pdf`;

      try {
        // const files = await readdir(path);
        const buffer = await readFile(filePath);
      } catch (error) {
        const logEntry = `Caminho no drive: ${contratada} => ${nameFolder} => ${contratante}\nTexto do conflito: ${contratante}\n-------------------------------------------------------------------------------\n`;

        const logEntryDois = `Caminho no drive: ${contratante} => ${nameFolder} => ${contratada}\nTexto do conflito: ${contratada}\n-------------------------------------------------------------------------------\n`;

        const filePath = `Caminho no drive: ${contratada} => ${nameFolder} => ${contratante} => ${doc}.pdf\n`;
        const filePathDois = `Caminho no drive: ${contratante} => ${nameFolder} => ${contratada} => ${doc}.pdf\n`;

        logsArray.push(filePath);
      }
    })
  );

  await logs(`${nameFolder}.txt`, logsArray.join("\n"));
};

/**
 * @function formatStr
 * @description FORMAT STRING
 * @param {string} str - The string to be formatted.
 * @returns {string} - The formatted string.
 * @example const formattedString = formatStr(' Example String. ');
 */
export const formatStr = (str) => {
  if (str[str.length - 1] == ".") return str.substring(0, str.length - 1);
  if (/[\n\r]/.test(str)) return str.replace(/[\n\r]/g, "");
  else return str.trim();
};

