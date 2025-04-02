// backend/server.js
const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(cors());

const upload = multer({ dest: "uploads/" });
let processedData = null;

console.log("Iniciando servidor...");

// Ruta para subir el archivo CSV
app.post("/api/upload", upload.single("file"), (req, res) => {
  console.log("POST /api/upload llamado");
  if (!req.file) {
    console.log("No se ha subido ningún archivo.");
    return res.status(400).json({ error: "No se ha subido ningún archivo." });
  }
  console.log("Archivo recibido:", req.file.originalname);

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => {
      results.push(data);
      // Log opcional para ver cada línea (puedes comentar si hay muchos datos)
      // console.log("Línea procesada:", data);
    })
    .on("end", () => {
      console.log(
        "Finalizó la lectura del archivo. Total de registros:",
        results.length
      );
      try {
        processedData = processData(results);
        console.log("Datos procesados correctamente.");
        // Elimina el archivo temporal después de procesarlo
        fs.unlink(req.file.path, (err) => {
          if (err) {
            console.error("Error eliminando el archivo:", err);
          } else {
            console.log("Archivo temporal eliminado:", req.file.path);
          }
        });
        res.json({
          message: "Archivo procesado exitosamente",
          data: processedData,
        });
      } catch (error) {
        console.error("Error al procesar los datos:", error);
        res.status(500).json({ error: "Error al procesar los datos." });
      }
    })
    .on("error", (error) => {
      console.error("Error en la lectura del archivo:", error.message);
      res.status(500).json({ error: error.message });
    });
});

// Ruta para obtener los datos procesados
app.get("/api/data", (req, res) => {
  console.log("GET /api/data llamado");
  if (!processedData) {
    console.log("No hay datos procesados disponibles.");
    return res.status(404).json({
      error: "No se han cargado datos. Por favor, sube un archivo primero.",
    });
  }
  console.log("Enviando datos procesados.");
  res.json(processedData);
});

/**
 * processData:
 * Genera:
 *  1. Un count plot para cada columna categórica
 *  2. Una matriz de correlación para las columnas numéricas
 */
function processData(data) {
  console.log("Iniciando el procesamiento de datos...");
  // Definir columnas según el CSV
  const categoricalColumns = [
    "sexo",
    "grad_estudios",
    "stem_intencion",
    "padres_estudios",
  ];
  const numericColumns = ["edad", "confianza_stem"];

  // Genera un objeto counts para cada columna categórica
  const counts = {};
  categoricalColumns.forEach((col) => {
    counts[col] = {};
  });

  data.forEach((row, index) => {
    categoricalColumns.forEach((col) => {
      const value = row[col] || "Sin dato";
      counts[col][value] = (counts[col][value] || 0) + 1;
    });
  });
  console.log("Conteos generados para columnas categóricas.");

  // Calcula la matriz de correlación para columnas numéricas
  const correlationMatrix = computeCorrelationMatrix(data, numericColumns);
  console.log("Matriz de correlación calculada.");

  console.log("Procesamiento completado.");
  return {
    counts, // Conteos para columnas categóricas
    correlation: correlationMatrix, // Matriz de correlaciones
    raw: data, // Datos originales
  };
}

// Calcula la matriz de correlación para un array de columnas numéricas
function computeCorrelationMatrix(data, columns) {
  const matrix = {};
  columns.forEach((col1) => {
    matrix[col1] = {};
    columns.forEach((col2) => {
      matrix[col1][col2] = computeCorrelationBetween(data, col1, col2);
    });
  });
  return matrix;
}

// Calcula el coeficiente de correlación de Pearson entre dos columnas
function computeCorrelationBetween(data, col1, col2) {
  const x = data
    .map((row) => parseFloat(row[col1]))
    .filter((val) => !isNaN(val));
  const y = data
    .map((row) => parseFloat(row[col2]))
    .filter((val) => !isNaN(val));
  const n = Math.min(x.length, y.length);
  if (n === 0) return null;

  const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
  const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
  const sumXY = x.slice(0, n).reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.slice(0, n).reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.slice(0, n).reduce((acc, yi) => acc + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );
  return denominator !== 0 ? numerator / denominator : 0;
}

app.listen(3000, () => {
  console.log("Servidor iniciado en el puerto 3000");
});
