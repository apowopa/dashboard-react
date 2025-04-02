// frontend/App.js
import React, { useState } from "react";
import axios from "axios";
import { ScrollView } from "react-native";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import "./styles.css"; // <--- Importa tu archivo CSS

// Registrar los componentes necesarios en Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function App() {
  const [data, setData] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Función para subir el archivo CSV
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    setUploadMessage("Subiendo y procesando archivo...");

    try {
      // Enviar archivo al backend
      const resUpload = await axios.post(
        "http://localhost:3000/api/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      console.log("Respuesta de subida:", resUpload.data);

      // Obtener la data procesada del backend
      const resData = await axios.get("http://localhost:3000/api/data");
      console.log("Datos recibidos:", resData.data);
      setData(resData.data);
      setUploadMessage("Archivo procesado exitosamente.");
    } catch (error) {
      console.error(
        "Error al subir o procesar el archivo:",
        error.response || error
      );
      setUploadMessage("Error al subir o procesar el archivo.");
    }
    setLoading(false);
  };

  // Renderiza la tabla con los datos crudos
  const renderRawDataTable = () => {
    if (!data || !data.raw || data.raw.length === 0) return null;
    const headers = Object.keys(data.raw[0]);
    return (
      <div className="table-container">
        <table>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.raw.map((row, index) => (
              <tr key={index}>
                {headers.map((header) => (
                  <td key={header}>{row[header]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Renderiza un gráfico de barras para cada variable categórica
  const renderBarCharts = () => {
    if (!data) return null;
    const categoricalColumns = Object.keys(data.counts);
    return categoricalColumns.map((col) => {
      const colData = data.counts[col];
      const barData = {
        labels: Object.keys(colData),
        datasets: [
          {
            label: `Conteo de ${col}`,
            data: Object.values(colData),
            backgroundColor: "rgba(75, 192, 192, 0.6)",
          },
        ],
      };
      return (
        <div className="chart-container" key={col}>
          <h3 className="chart-title">Conteo de {col}</h3>
          <Bar
            data={barData}
            options={{ responsive: true, maintainAspectRatio: false }}
          />
        </div>
      );
    });
  };

  // Función para calcular histogramas de un array de números
  const computeHistogram = (dataArray, bins = 10) => {
    if (dataArray.length === 0) return { labels: [], counts: [] };
    const min = Math.min(...dataArray);
    const max = Math.max(...dataArray);
    const binWidth = (max - min) / bins;
    const counts = Array(bins).fill(0);
    const labels = [];

    // Inicializa labels para cada bin
    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binWidth;
      const binEnd = binStart + binWidth;
      labels.push(`${binStart.toFixed(1)}-${binEnd.toFixed(1)}`);
    }

    // Cuenta los elementos en cada bin
    dataArray.forEach((value) => {
      let binIndex = Math.floor((value - min) / binWidth);
      if (binIndex === bins) binIndex--; // Para el valor máximo
      counts[binIndex]++;
    });

    return { labels, counts };
  };

  // Renderiza histogramas para variables numéricas
  const renderNumericHistograms = () => {
    if (!data || !data.raw || data.raw.length === 0) return null;
    const numericColumns = ["edad", "confianza_stem"];
    return numericColumns.map((col) => {
      const values = data.raw
        .map((row) => parseFloat(row[col]))
        .filter((val) => !isNaN(val));
      const histogram = computeHistogram(values, 10);
      const barData = {
        labels: histogram.labels,
        datasets: [
          {
            label: `Frecuencia de ${col}`,
            data: histogram.counts,
            backgroundColor: "rgba(153, 102, 255, 0.6)",
          },
        ],
      };
      return (
        <div className="chart-container" key={col}>
          <h3 className="chart-title">Histograma de {col}</h3>
          <Bar
            data={barData}
            options={{ responsive: true, maintainAspectRatio: false }}
          />
        </div>
      );
    });
  };

  // Renderiza una tabla para la matriz de correlación
  const renderCorrelationTable = () => {
    if (!data || !data.correlation) return null;
    const cols = Object.keys(data.correlation);
    return (
      <table className="correlation-table">
        <thead>
          <tr>
            <th></th>
            {cols.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cols.map((row) => (
            <tr key={row}>
              <td>
                <strong>{row}</strong>
              </td>
              {cols.map((col) => (
                <td key={col}>
                  {data.correlation[row][col] !== null
                    ? data.correlation[row][col].toFixed(2)
                    : "N/A"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <ScrollView contentContainerStyle={{}}>
      <div className="container">
        <h1 className="dashboard-title">Dashboard de Estudiantes</h1>
        <div className="file-upload-section">
          <h2 className="section-title">Subir Archivo CSV</h2>
          <input type="file" accept=".csv" onChange={handleFileUpload} />
          {uploadMessage && <p className="upload-message">{uploadMessage}</p>}
        </div>
        {loading && <p>Cargando datos...</p>}
        {data && (
          <>
            <h2 className="section-title">Datos Crudos</h2>
            {renderRawDataTable()}
            <h2 className="section-title">Count Plots</h2>
            {renderBarCharts()}
            <h2 className="section-title">
              Histogramas de Variables Numéricas
            </h2>
            {renderNumericHistograms()}
            <h2 className="section-title">Matriz de Correlación</h2>
            {renderCorrelationTable()}
          </>
        )}
      </div>
    </ScrollView>
  );
}
