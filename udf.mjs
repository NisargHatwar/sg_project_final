import { readFile, writeFile } from "fs/promises";

function getRandStr(leng) {
  let num = "";
  for (let i = 0; i < leng; i++) {
    const n = Math.floor(Math.random() * 10);
    num = num + String(n);
  }
  return num;
}

async function readData(filePath) {
  try {
    const content = await readFile(filePath, "utf8");
    const cont = await JSON.parse(content);
    return cont;
  } catch (error) {
    console.error("Error reading file:", error);
    throw error;
  }
}

async function writeData(filePath, info) {
  try {
    await writeFile(filePath, JSON.stringify(info));
    return;
  } catch (error) {
    console.error("Error writing in this file: ", error);
    throw error;
  }
}

export { getRandStr, readData, writeData };
