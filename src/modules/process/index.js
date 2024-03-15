import { readdir } from "fs/promises";
import { logs } from "../utils/index.js";
import fs from "fs";
import {
  createFolderAtCLM,
  uploadDocuments,
  updateAttributes,
} from "../services/index.js";

import dotenv from "dotenv";

import { EventEmitter } from "events";

EventEmitter.defaultMaxListeners = 3000;

dotenv.config();
const accountID = process.env.ACCOUNT_ID;
const fatherFolderID = process.env.FATHER_FOLDER_ID;

/**
 * @async
 * @function base64EncodeStream
 * @description NODEJS STREAMS WITH CHUNKS
 * @param {string} filePath - File path of the document to be encoded.
 * @returns {Promise<string>} - Base64-encoded string representation of the document.
 * @throws {Error} - Throws an error if there is an issue reading or encoding the file.
 * @example base64EncodeStream('./src/Files/clientes/123/arquivo1.pdf');
 */
const base64EncodeStream = async (filePath) => {
  const readable = fs.createReadStream(filePath, { highWaterMark: 262144 });
  let data = "";
  let counterChunk = 0;

  readable.on("data", async (chunk) => {
    counterChunk++;
    data += chunk.toString("base64");
  });

  return new Promise((resolve, reject) => {
    readable.on("end", () => {
      resolve(data);
      console.log(`Leitura completa do arquivo: ${filePath} finalizada!\n`);
    });

    readable.on("error", (error) => {
      logs("unprocessArchives.txt", `Unprocessed: ${filePath}`);

      reject(error);
    });
  });
};

/**
 * @async
 * @function processUnitaryFiles
 * @description PROCESS UNITARY FILES FUNCTION
 * @param {string} mainDirectory - Main directory containing the files to be processed.
 * @param {string} directory - Subdirectory within the main directory.
 * @param {string} token - Authentication token.
 * @param {string} file - Name of the file to be processed.
 * @param {Object} attributes - Attributes to be associated with the processed document.
 * @example await processUnitaryFiles('Files', 'clientes', 'token123', 'arquivo1.pdf', {attribute1: 'value1', attribute2: 'value2'});
 */
export const processUnitaryFiles = async (
  mainDirectory,
  directory,
  token,
  file,
  attributes
) => {
  const folderPath = `./src/Files/${mainDirectory}/${directory}/${file}`;

  try {
    const base64Content = await base64EncodeStream(folderPath);
    const folderID = await createFolderAtCLM(
      directory,
      folderPath,
      token,
      fatherFolderID
    );

    const documentID = await uploadDocuments(
      file,
      base64Content,
      accountID,
      token,
      folderID
    );

    await updateAttributes(attributes, documentID, token);
  } catch (error) {
    const documentPath = `./src/${mainDirectory}/${directory}/${file}`;
    logs(
      "requestError.txt",
      `Erro no arquivo: ${documentPath}${file}. ${error}\n`
    );
    console.error(error);
  }
};

/**
 * @async
 * @function processFullFolder
 * @description PROCESS FULL FOLDER FILES FUNCTION
 * @param {string} mainDirectory - Main directory containing the files to be processed.
 * @param {string} directory - Subdirectory within the main directory.
 * @param {string} token - Authentication token.
 * @param {string} file - Name of the file to be processed.
 * @example await processFullFolder('Files', 'clientes', 'token123', 'arquivo1.pdf', {attribute1: 'value1', attribute2: 'value2'});
 */
export const processFullFolder = async (mainDirectory, directory, token) => {
  const documentPath = `./src/Files/${mainDirectory}/${directory}/`;
  const folders = await readdir(documentPath);
  folders.sort((a, b) => a - b);

  const uploadPromises = [];

  for (const folder of folders) {
    const folderPath = documentPath + `${folder}/`;
    const folderID = await createFolderAtCLM(folder, folderPath, token);
    const files = await readdir(folderPath);
    const concurrencyLimit = files.length;
    const fileBatches = paginateArray(files, concurrencyLimit);
    for (const batch of fileBatches) {
      const batchPromises = batch.map(async (file) => {
        try {
          if (file.includes(".")) {
            const base64Content = await base64EncodeStream(
              folderPath + `${file}`
            );
            await uploadDocuments(
              file,
              base64Content,
              accountID,
              token,
              folderID,
              folderPath + `${file}`
            );
          } else {
            logs("notExt.txt", `Arquivo sem extensão: ${folderPath}${file}\n`);
          }
        } catch (error) {
          logs(
            "requestError.txt",
            `Erro no arquivo: ${folderPath}${file}. ${error}\n`
          );
          console.error(error);
        }
      });

      uploadPromises.push(...batchPromises);

      await Promise.all(uploadPromises);

      uploadPromises.length = 0;
    }
  }

  await Promise.all(uploadPromises);
};
